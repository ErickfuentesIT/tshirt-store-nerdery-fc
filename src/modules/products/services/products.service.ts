import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CustomConfigService } from '../../../common/config/config.service.js';
import { StripeService } from '../../../common/stripe/stripe.service.js';
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

// Shape returned by StripeService.generateVariantStripeData — kept here
// to avoid importing the raw Stripe SDK types into the service.
type VariantStripeData = {
  stripeProductId: string;
  stripePriceId: string;
  stripePaymentLinkId: string;
  stripePaymentLinkUrl: string;
};

@Injectable()
export class ProductsService {
  private readonly bucketUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: CustomConfigService,
    private readonly stripeService: StripeService,
  ) {
    const { s3BucketName, region } = this.configService.aws;
    this.bucketUrl = `https://${s3BucketName}.s3.${region}.amazonaws.com`;
  }

  async createWithVariants(data: CreateProductWithVariantsInput) {
    // ── Phase 1: Generate Stripe objects for every variant ─────────────────
    // Stripe API calls MUST live outside the Prisma transaction.
    // A slow network call inside a transaction holds a DB connection open
    // for its full duration, which exhausts the connection pool under load.
    //
    // Image URLs are computed here from imageKeys + bucketUrl so they can
    // be passed to Stripe (shown on the hosted payment page) without waiting
    // for the DB write to happen.
    const stripeDataList: VariantStripeData[] = [];

    for (const variantInput of data.variants) {
      const imageUrls = variantInput.imageKeys.map(
        (key) => `${this.bucketUrl}/${key}`,
      );
      const stripeData = await this.stripeService.generateVariantStripeData(
        data.name,
        variantInput.priceCents,
        imageUrls,
      );
      stripeDataList.push(stripeData);
    }

    // ── Phase 2: DB transaction ────────────────────────────────────────────
    // If the transaction rolls back (duplicate SKU, missing category, etc.)
    // we immediately deactivate the Stripe objects created above so they
    // don't appear as live products/links in the Stripe dashboard.
    try {
      return await this.prisma.$transaction(async (tx) => {
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

        const attributeMap = new Map(attributes.map((a) => [a.id, a.code]));
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

        // 4. Create each variant with its Stripe IDs, SKU, junction records, and images.
        //    We iterate by index so each variant can access its pre-generated stripeData.
        for (let i = 0; i < data.variants.length; i++) {
          const variantInput = data.variants[i];
          const stripeData = stripeDataList[i];

          assertNoDuplicateCategories(variantInput.attributeValueIds, attributeMeta);

          const codes = variantInput.attributeValueIds.map(
            (id) => attributeMap.get(id) as string,
          );
          const sku = generateSku(data.name, codes);

          // Let the DB unique constraint be the source of truth for SKU uniqueness.
          let variant;
          try {
            variant = await tx.productVariant.create({
              data: {
                productId: product.id,
                sku,
                stock: variantInput.stock,
                priceCents: variantInput.priceCents,
                stripeProductId: stripeData.stripeProductId,
                stripePriceId: stripeData.stripePriceId,
                stripePaymentLinkId: stripeData.stripePaymentLinkId,
                stripePaymentLinkUrl: stripeData.stripePaymentLinkUrl,
              },
            });
          } catch (error) {
            if ((error as { code?: string })?.code === 'P2002') {
              throw new ConflictException(`SKU "${sku}" already exists`);
            }
            throw error;
          }

          await tx.variantAttributeCategory.createMany({
            data: variantInput.attributeValueIds.map((attributeId) => ({
              variantId: variant.id,
              attributeId,
            })),
          });

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

        return product;
      });
    } catch (error) {
      // Deactivate orphaned Stripe objects. Errors here are swallowed so the
      // original DB error is what surfaces to the caller.
      await this.stripeService
        .deactivateVariantStripeData(stripeDataList)
        .catch((cleanupErr) =>
          console.error('Stripe cleanup failed after DB rollback:', cleanupErr),
        );
      throw error;
    }
  }

  async addVariants(productId: string, data: AddVariantsInput) {
    // ── Phase 1: Pre-flight validation and Stripe generation ───────────────
    // We need the product name for Stripe BEFORE the transaction.
    // This pre-fetch also gives us an early 404 before touching Stripe at all.
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const stripeDataList: VariantStripeData[] = [];

    for (const variantInput of data.variants) {
      const imageUrls = (variantInput.imageKeys ?? []).map(
        (key) => `${this.bucketUrl}/${key}`,
      );
      const stripeData = await this.stripeService.generateVariantStripeData(
        product.name,
        variantInput.priceCents,
        imageUrls,
      );
      stripeDataList.push(stripeData);
    }

    // ── Phase 2: DB transaction ────────────────────────────────────────────
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Re-validate the product inside the transaction to protect against
        // a concurrent deletion between the pre-fetch and the transaction start.
        const lockedProduct = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!lockedProduct) {
          throw new NotFoundException(`Product with ID "${productId}" not found`);
        }

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

        for (let i = 0; i < data.variants.length; i++) {
          const variantInput = data.variants[i];
          const stripeData = stripeDataList[i];

          assertNoDuplicateCategories(variantInput.attributeValueIds, attributeMeta);

          const codes = variantInput.attributeValueIds.map(
            (id) => attributeMap.get(id) as string,
          );
          const sku = generateSku(lockedProduct.name, codes);

          let variant;
          try {
            variant = await tx.productVariant.create({
              data: {
                productId: lockedProduct.id,
                sku,
                stock: variantInput.stock,
                priceCents: variantInput.priceCents,
                stripeProductId: stripeData.stripeProductId,
                stripePriceId: stripeData.stripePriceId,
                stripePaymentLinkId: stripeData.stripePaymentLinkId,
                stripePaymentLinkUrl: stripeData.stripePaymentLinkUrl,
              },
            });
          } catch (error) {
            if ((error as { code?: string })?.code === 'P2002') {
              throw new ConflictException(`Variant with SKU "${sku}" already exists`);
            }
            throw error;
          }

          await tx.variantAttributeCategory.createMany({
            data: variantInput.attributeValueIds.map((attributeId) => ({
              variantId: variant.id,
              attributeId,
            })),
          });

          if (variantInput.imageKeys?.length > 0) {
            await tx.image.createMany({
              data: variantInput.imageKeys.map((key) => ({
                productId: lockedProduct.id,
                variantId: variant.id,
                imageKey: key,
                imageUrl: `${this.bucketUrl}/${key}`,
              })),
            });
          }
        }

        return lockedProduct;
      });
    } catch (error) {
      await this.stripeService
        .deactivateVariantStripeData(stripeDataList)
        .catch((cleanupErr) =>
          console.error('Stripe cleanup failed after DB rollback:', cleanupErr),
        );
      throw error;
    }
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
