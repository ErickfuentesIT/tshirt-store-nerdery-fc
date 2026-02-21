import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class OrderPaymentsLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['payment']['findMany']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (orderIds: readonly string[]) => {
      const payments = await this.prisma.payment.findMany({
        where: { orderId: { in: [...orderIds] } },
      });

      const grouped = new Map<string, typeof payments>();
      for (const id of orderIds) grouped.set(id, []);
      for (const payment of payments) grouped.get(payment.orderId)!.push(payment);

      return orderIds.map((id) => grouped.get(id)!);
    });
  }
}
