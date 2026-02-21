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
import { slugify } from '../helper/slugify.helper.js';
import { AttributeMeta } from '../types/attribute-meta.type.js';
import { VariantStripeData } from '../types/variant-stripe-data.type.js';
import { assertNoDuplicateCategories } from '../helper/assert-no-duplicate-categories.helper.js';
import { generateSku } from '../helper/generate-sku.helper.js';

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

    try {
      return await this.prisma.$transaction(async (tx) => {
        const category = await tx.category.findUnique({
          where: { id: data.categoryId },
        });
        if (!category) {
          throw new NotFoundException(
            `Category with ID "${data.categoryId}" not found`,
          );
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
          throw new NotFoundException(
            `Attributes not found: ${missingIds.join(', ')}`,
          );
        }

        const attributeMap = new Map(attributes.map((a) => [a.id, a.code]));
        const attributeMeta = new Map<string, AttributeMeta>(
          attributes.map((a) => [
            a.id,
            {
              categoryId: a.attributeCategoryId,
              categoryName: a.attributeCategory.name,
            },
          ]),
        );

        const product = await tx.product.create({
          data: {
            name: data.name,
            description: data.description,
            basePrice: data.basePrice,
            categoryId: data.categoryId,
          },
        });

        for (let i = 0; i < data.variants.length; i++) {
          const variantInput = data.variants[i];
          const stripeData = stripeDataList[i];

          assertNoDuplicateCategories(
            variantInput.attributeValueIds,
            attributeMeta,
          );

          const codes = variantInput.attributeValueIds.map(
            (id) => attributeMap.get(id) as string,
          );
          const sku = generateSku(data.name, codes);

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
      await this.stripeService
        .deactivateVariantStripeData(stripeDataList)
        .catch((cleanupErr) =>
          console.error('Stripe cleanup failed after DB rollback:', cleanupErr),
        );
      throw error;
    }
  }

  async addVariants(productId: string, data: AddVariantsInput) {
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

    try {
      return await this.prisma.$transaction(async (tx) => {
        const lockedProduct = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!lockedProduct) {
          throw new NotFoundException(
            `Product with ID "${productId}" not found`,
          );
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
          throw new NotFoundException(
            `Attributes not found: ${missingIds.join(', ')}`,
          );
        }

        const attributeMap = new Map(attributes.map((a) => [a.id, a.code]));
        const attributeMeta = new Map<string, AttributeMeta>(
          attributes.map((a) => [
            a.id,
            {
              categoryId: a.attributeCategoryId,
              categoryName: a.attributeCategory.name,
            },
          ]),
        );

        for (let i = 0; i < data.variants.length; i++) {
          const variantInput = data.variants[i];
          const stripeData = stripeDataList[i];

          assertNoDuplicateCategories(
            variantInput.attributeValueIds,
            attributeMeta,
          );

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
              throw new ConflictException(
                `Variant with SKU "${sku}" already exists`,
              );
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
