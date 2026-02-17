import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { UpdateAttributeInput } from '../dto/update-attribute.input.js';

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    attributeCategory: true,
  };

  async findAll(attributeCategoryId: string) {
    return this.prisma.attribute.findMany({
      where: { attributeCategoryId },
      include: this.includeRelations,
    });
  }

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID "${id}" not found`);
    }

    return attribute;
  }

  async update(id: string, data: UpdateAttributeInput) {
    await this.findOne(id);

    return this.prisma.attribute.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.attribute.delete({
      where: { id },
      include: this.includeRelations,
    });
  }
}
