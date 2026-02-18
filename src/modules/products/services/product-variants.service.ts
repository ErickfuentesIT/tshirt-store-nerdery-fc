import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { UpdateProductVariantInput } from '../dto/update-product-variant.input.js';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
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
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prisma.productVariant.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
