import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class VariantAttributesLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['variantAttributeCategory']['findMany']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (variantIds: readonly string[]) => {
      const records = await this.prisma.variantAttributeCategory.findMany({
        where: { variantId: { in: [...variantIds] } },
      });

      const grouped = new Map<string, typeof records>();
      for (const id of variantIds) grouped.set(id, []);
      for (const record of records) grouped.get(record.variantId)!.push(record);

      return variantIds.map((id) => grouped.get(id)!);
    });
  }
}
