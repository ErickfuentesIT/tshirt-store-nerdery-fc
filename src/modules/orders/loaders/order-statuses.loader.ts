import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class OrderStatusesLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['orderStatus']['findMany']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (orderIds: readonly string[]) => {
      const statuses = await this.prisma.orderStatus.findMany({
        where: { orderId: { in: [...orderIds] } },
        orderBy: { createdAt: 'asc' },
      });

      const grouped = new Map<string, typeof statuses>();
      for (const id of orderIds) grouped.set(id, []);
      for (const status of statuses) grouped.get(status.orderId)!.push(status);

      return orderIds.map((id) => grouped.get(id)!);
    });
  }
}
