import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class AttributeLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['attribute']['findFirst']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (attributeIds: readonly string[]) => {
      const attributes = await this.prisma.attribute.findMany({
        where: { id: { in: [...attributeIds] } },
      });

      const map = new Map(attributes.map((a) => [a.id, a]));
      return attributeIds.map((id) => map.get(id) ?? null);
    });
  }
}
