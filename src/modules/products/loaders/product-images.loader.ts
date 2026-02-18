import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class ProductImagesLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['image']['findMany']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (productIds: readonly string[]) => {
      const images = await this.prisma.image.findMany({
        where: { productId: { in: [...productIds] } },
      });

      const grouped = new Map<string, typeof images>();
      for (const id of productIds) grouped.set(id, []);
      for (const image of images) {
        if (image.productId) grouped.get(image.productId)!.push(image);
      }

      return productIds.map((id) => grouped.get(id)!);
    });
  }
}
