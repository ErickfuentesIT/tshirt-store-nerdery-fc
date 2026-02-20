import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class OrderItemsLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['orderItem']['findMany']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (orderIds: readonly string[]) => {
      const items = await this.prisma.orderItem.findMany({
        where: { orderId: { in: [...orderIds] } },
      });

      const grouped = new Map<string, typeof items>();
      for (const id of orderIds) grouped.set(id, []);
      for (const item of items) grouped.get(item.orderId)!.push(item);

      return orderIds.map((id) => grouped.get(id)!);
    });
  }
}
