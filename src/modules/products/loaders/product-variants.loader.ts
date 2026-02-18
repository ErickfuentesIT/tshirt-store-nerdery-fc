import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class ProductVariantsLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['productVariant']['findMany']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (productIds: readonly string[]) => {
      const variants = await this.prisma.productVariant.findMany({
        where: { productId: { in: [...productIds] }, isActive: true },
        orderBy: { updatedAt: 'desc' },
      });

      const grouped = new Map<string, typeof variants>();
      for (const id of productIds) grouped.set(id, []);
      for (const variant of variants) grouped.get(variant.productId)!.push(variant);

      return productIds.map((id) => grouped.get(id)!);
    });
  }
}
