import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CustomConfigService } from '../../../common/config/config.service.js';
import { UpdateProductInput } from '../dto/update-product.input.js';
import { CreateProductWithVariantsInput } from '../dto/create-product-with-variants.input.js';
import { AddVariantsInput } from '../dto/add-variants.input.js';

/**
 * Slugifies a string into an uppercase, hyphen-separated format.
 * e.g. "Summer T-Shirt" → "SUMMER-T-SHIRT"
 */
function slugify(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates a deterministic SKU from the product name and attribute values.
 * Values are sorted alphabetically to guarantee uniqueness regardless of input order.
 * e.g. ("Summer T-Shirt", ["Red", "S"]) → "SUMMER-T-SHIRT-RED-S"
 */
function generateSku(productName: string, attributeValues: string[]): string {
  const sluggedName = slugify(productName);
  const sortedValues = [...attributeValues]
    .map((v) => slugify(v))
    .sort();
  return [sluggedName, ...sortedValues].join('-');
}

type AttributeMeta = { categoryId: string; categoryName: string };

/**
 * Ensures that no two attribute IDs in a single variant belong to the same
 * AttributeCategory. A variant must have exactly one value per category
 * (e.g. one Color, one Size — never two Colors).
 */
function assertNoDuplicateCategories(
  attributeValueIds: string[],
  attributeMeta: Map<string, AttributeMeta>,
): void {
  const seen = new Map<string, string>(); // categoryId → first attributeId seen
  for (const attrId of attributeValueIds) {
    const { categoryId, categoryName } = attributeMeta.get(attrId)!;
    if (seen.has(categoryId)) {
      throw new BadRequestException(
        `Variant has more than one attribute from category "${categoryName}". ` +
          `A variant may only have one value per attribute category.`,
      );
    }
    seen.set(categoryId, attrId);
  }
}

@Injectable()
export class ProductsService {
  private readonly bucketUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: CustomConfigService,
  ) {
    const { s3BucketName, region } = this.configService.aws;
    this.bucketUrl = `https://${s3BucketName}.s3.${region}.amazonaws.com`;
  }


  async createWithVariants(data: CreateProductWithVariantsInput) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate category exists
      const category = await tx.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${data.categoryId}" not found`,
        );
      }

      // 2. Collect all unique attribute IDs across all variants and validate
      const allAttributeIds = [
        ...new Set(data.variants.flatMap((v) => v.attributeValueIds)),
      ];

      const attributes = await tx.attribute.findMany({
        where: { id: { in: allAttributeIds } },
        include: { attributeCategory: { select: { name: true } } },
      });

      if (attributes.length !== allAttributeIds.length) {
        const foundIds = new Set(attributes.map((a) => a.id));
        const missingIds = allAttributeIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Attributes not found: ${missingIds.join(', ')}`,
        );
      }

      // attributeId → code (for SKU generation)
      const attributeMap = new Map(attributes.map((a) => [a.id, a.code]));
      // attributeId → { categoryId, categoryName } (for duplicate-category validation)
      const attributeMeta = new Map<string, AttributeMeta>(
        attributes.map((a) => [
          a.id,
          { categoryId: a.attributeCategoryId, categoryName: a.attributeCategory.name },
        ]),
      );

      // 3. Create the product
      const product = await tx.product.create({
        data: {
          name: data.name,
          description: data.description,
          basePrice: data.basePrice,
          categoryId: data.categoryId,
        },
      });

      // 4. Create each variant with its SKU, junction records, and images
      for (const variantInput of data.variants) {
        assertNoDuplicateCategories(variantInput.attributeValueIds, attributeMeta);

        // Resolve immutable codes for SKU generation
        const codes = variantInput.attributeValueIds.map(
          (id) => attributeMap.get(id) as string,
        );
        const sku = generateSku(data.name, codes);

        // Let the DB unique constraint be the source of truth.
        // Catching P2002 here is safer than a check-then-act pattern,
        // which is vulnerable to race conditions under concurrent requests.
        let variant;
        try {
          variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku,
              stock: variantInput.stock,
              priceCents: variantInput.priceCents,
            },
          });
        } catch (error) {
          if ((error as { code?: string })?.code === 'P2002') {
            throw new ConflictException(`SKU "${sku}" already exists`);
          }
          throw error;
        }

        // Create junction records (variant ↔ attributes)
        await tx.variantAttributeCategory.createMany({
          data: variantInput.attributeValueIds.map((attributeId) => ({
            variantId: variant.id,
            attributeId,
          })),
        });

        // Create images linked to both the product and the variant
        if (variantInput.imageKeys.length > 0) {
          await tx.image.createMany({
            data: variantInput.imageKeys.map((key) => ({
              productId: product.id,
              variantId: variant.id,
              imageKey: key,
              imageUrl: `${this.bucketUrl}/${key}`,
            })),
          });
        }
      }

      // 5. Return the product — field resolvers handle all nested relations
      return product;
    });
  }

  async addVariants(productId: string, data: AddVariantsInput) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Validate the parent product exists
    const product = await tx.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    // 2. Collect and validate attributes (Reuse your existing logic)
    const allAttributeIds = [
      ...new Set(data.variants.flatMap((v) => v.attributeValueIds)),
    ];

    const attributes = await tx.attribute.findMany({
      where: { id: { in: allAttributeIds } },
      include: { attributeCategory: { select: { name: true } } },
    });

    if (attributes.length !== allAttributeIds.length) {
      const foundIds = new Set(attributes.map((a) => a.id));
      const missingIds = allAttributeIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Attributes not found: ${missingIds.join(', ')}`);
    }

    const attributeMap = new Map(attributes.map((a) => [a.id, a.code]));
    const attributeMeta = new Map<string, AttributeMeta>(
      attributes.map((a) => [
        a.id,
        { categoryId: a.attributeCategoryId, categoryName: a.attributeCategory.name },
      ]),
    );

    // 3. Process new variants
    for (const variantInput of data.variants) {
      assertNoDuplicateCategories(variantInput.attributeValueIds, attributeMeta);

      const codes = variantInput.attributeValueIds.map(
        (id) => attributeMap.get(id) as string,
      );
      const sku = generateSku(product.name, codes);

      // 4. Delegate uniqueness enforcement to the DB constraint (P2002).
      // This avoids a check-then-act race condition.
      let variant;
      try {
        variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            sku,
            stock: variantInput.stock,
            priceCents: variantInput.priceCents,
          },
        });
      } catch (error) {
        if ((error as { code?: string })?.code === 'P2002') {
          throw new ConflictException(`Variant with SKU "${sku}" already exists`);
        }
        throw error;
      }

      // 6. Link attributes
      await tx.variantAttributeCategory.createMany({
        data: variantInput.attributeValueIds.map((attributeId) => ({
          variantId: variant.id,
          attributeId,
        })),
      });

      // 7. Link images
      if (variantInput.imageKeys?.length > 0) {
        await tx.image.createMany({
          data: variantInput.imageKeys.map((key) => ({
            productId: product.id,
            variantId: variant.id,
            imageKey: key,
            imageUrl: `${this.bucketUrl}/${key}`,
          })),
        });
      }
    }

    // 8. Return the product — field resolvers handle all nested relations
    return product;
  });
}


  async findAll(skip: number, take: number) {
    return this.prisma.product.findMany({
      where: { isActive: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(id: string, data: UpdateProductInput) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
