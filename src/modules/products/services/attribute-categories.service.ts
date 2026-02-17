import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CreateAttributeCategoryInput } from '../dto/create-attribute-category.input.js';
import { UpdateAttributeCategoryInput } from '../dto/update-attribute-category.input.js';

@Injectable()
export class AttributeCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    attribute: true,
  };

  async create(data: CreateAttributeCategoryInput) {
    return this.prisma.attributeCategory.create({
      data,
      include: this.includeRelations,
    });
  }

  async findAll(attributeId: string) {
    return this.prisma.attributeCategory.findMany({
      where: { attributeId },
      include: this.includeRelations,
    });
  }

  async findOne(id: string) {
    const attributeCategory = await this.prisma.attributeCategory.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!attributeCategory) {
      throw new NotFoundException(
        `Attribute category with ID "${id}" not found`,
      );
    }

    return attributeCategory;
  }

  async update(id: string, data: UpdateAttributeCategoryInput) {
    await this.findOne(id);

    return this.prisma.attributeCategory.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.attributeCategory.delete({
      where: { id },
      include: this.includeRelations,
    });
  }
}
