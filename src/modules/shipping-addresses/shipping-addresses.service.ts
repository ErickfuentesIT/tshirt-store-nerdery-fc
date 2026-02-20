import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { CreateShippingAddressInput } from './dto/create-shipping-address.input.js';
import { UpdateShippingAddressInput } from './dto/update-shipping-address.input.js';

@Injectable()
export class ShippingAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string) {
    return this.prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, input: CreateShippingAddressInput) {
    return this.prisma.shippingAddress.create({
      data: { ...input, userId },
    });
  }

  async update(userId: string, input: UpdateShippingAddressInput) {
    const { id, ...data } = input;

    await this.findOwnOrThrow(id, userId);

    return this.prisma.shippingAddress.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.findOwnOrThrow(id, userId);

    return this.prisma.shippingAddress.delete({ where: { id } });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  // Fetches an address by ID and verifies it belongs to the requesting user.
  // Used by update and remove to enforce ownership at the service layer,
  // independent of CASL, so that a client can never touch another user's address
  // even if they somehow know the ID.
  private async findOwnOrThrow(id: string, userId: string) {
    const address = await this.prisma.shippingAddress.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`Shipping address "${id}" not found.`);
    }

    if (address.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this address.',
      );
    }

    return address;
  }
}
