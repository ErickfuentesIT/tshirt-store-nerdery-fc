import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { CreateProductInput } from '../dto/create-product.input.js';
import { UpdateProductInput } from '../dto/update-product.input.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeRelations = {
    category: true,
    variants: true,
    images: true,
  };

  async create(data: CreateProductInput) {
    return this.prisma.product.create({
      data,
      include: this.includeRelations,
    });
  }

  async findAll(skip: number, take: number) {
    return this.prisma.product.findMany({
      where: { isActive: true },
      skip,
      take,
      include: this.includeRelations,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.includeRelations,
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
      include: this.includeRelations,
    });
  }

  async disable(id: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: this.includeRelations,
    });
  }
}
