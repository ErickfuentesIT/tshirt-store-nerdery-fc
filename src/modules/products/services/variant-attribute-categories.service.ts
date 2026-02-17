import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CreateVariantAttributeCategoryInput } from '../dto/create-variant-attribute-category.input.js';

@Injectable()
export class VariantAttributeCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    attributeCategory: {
      include: {
        attribute: true,
      },
    },
  };

  async create(data: CreateVariantAttributeCategoryInput) {
    return this.prisma.variantAttributeCategory.create({
      data,
      include: this.includeRelations,
    });
  }

  async findAllByVariant(variantId: string) {
    return this.prisma.variantAttributeCategory.findMany({
      where: { variantId },
      include: this.includeRelations,
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.variantAttributeCategory.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!record) {
      throw new NotFoundException(
        `Variant attribute category with ID "${id}" not found`,
      );
    }

    return record;
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.variantAttributeCategory.delete({
      where: { id },
      include: this.includeRelations,
    });
  }
}
