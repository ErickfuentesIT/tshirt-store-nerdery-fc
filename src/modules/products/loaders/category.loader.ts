import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class CategoryLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['category']['findFirst']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (categoryIds: readonly string[]) => {
      const categories = await this.prisma.category.findMany({
        where: { id: { in: [...categoryIds] } },
      });

      const map = new Map(categories.map((c) => [c.id, c]));
      return categoryIds.map((id) => map.get(id) ?? null);
    });
  }
}
