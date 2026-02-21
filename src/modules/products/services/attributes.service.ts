import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { UpdateAttributeInput } from '../dto/update-attribute.input.js';

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const attribute = await this.prisma.attribute.findUnique({
      where: { id },
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
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const usageCount = await this.prisma.variantAttributeCategory.count({
      where: { attributeId: id },
    });

    if (usageCount > 0) {
      throw new ConflictException(
        `Cannot delete attribute: it is assigned to ${usageCount} product variant(s). Disable the variants first.`,
      );
    }

    return this.prisma.attribute.delete({
      where: { id },
    });
  }
}
