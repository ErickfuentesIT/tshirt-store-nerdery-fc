import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { PrismaService } from '../../../common/prisma/prisma.service.js';

@Injectable({ scope: Scope.REQUEST })
export class OrderShippingAddressLoader {
  readonly loader: DataLoader<string, Awaited<ReturnType<PrismaService['shippingAddress']['findUnique']>>>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader(async (addressIds: readonly string[]) => {
      const addresses = await this.prisma.shippingAddress.findMany({
        where: { id: { in: [...addressIds] } },
      });

      const byId = new Map(addresses.map((a) => [a.id, a]));
      return addressIds.map((id) => byId.get(id) ?? null);
    });
  }
}
