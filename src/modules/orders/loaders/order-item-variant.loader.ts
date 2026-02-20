import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class OrderItemVariantLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['productVariant']['findUnique']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (variantIds: readonly string[]) => {
      const variants = await this.prisma.productVariant.findMany({
        where: { id: { in: [...variantIds] } },
      });

      const byId = new Map(variants.map((v) => [v.id, v]));
      return variantIds.map((id) => byId.get(id) ?? null);
    });
  }
}
