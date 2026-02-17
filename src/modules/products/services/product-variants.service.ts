import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CreateProductVariantInput } from '../dto/create-product-variant.input.js';
import { UpdateProductVariantInput } from '../dto/update-product-variant.input.js';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    images: true,
    variantAttributes: {
      include: {
        attributeCategory: {
          include: {
            attribute: true,
          },
        },
      },
    },
  };

  async create(data: CreateProductVariantInput) {
    return this.prisma.productVariant.create({
      data,
      include: this.includeRelations,
    });
  }

  async findAll(productId: string, skip: number, take: number) {
    return this.prisma.productVariant.findMany({
      where: { productId, isActive: true },
      skip,
      take,
      include: this.includeRelations,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!variant) {
      throw new NotFoundException(`Product variant with ID "${id}" not found`);
    }

    return variant;
  }

  async update(id: string, data: UpdateProductVariantInput) {
    await this.findOne(id);

    return this.prisma.productVariant.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.productVariant.delete({
      where: { id },
      include: this.includeRelations,
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prisma.productVariant.update({
      where: { id },
      data: { isActive: false },
      include: this.includeRelations,
    });
  }
}
