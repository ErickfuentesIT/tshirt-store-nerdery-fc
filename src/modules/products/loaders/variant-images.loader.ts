import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class VariantImagesLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['image']['findMany']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (variantIds: readonly string[]) => {
      const images = await this.prisma.image.findMany({
        where: { variantId: { in: [...variantIds] } },
      });

      const grouped = new Map<string, typeof images>();
      for (const id of variantIds) grouped.set(id, []);
      for (const image of images) {
        if (image.variantId) grouped.get(image.variantId)!.push(image);
      }

      return variantIds.map((id) => grouped.get(id)!);
    });
  }
}
