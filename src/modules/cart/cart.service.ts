import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AddItemToCartInput } from './dto/add-item-to-cart.input.js';
import { UpdateCartItemInput } from './dto/update-cart-item.input.js';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addItemToCart(userId: string, input: AddItemToCartInput) {
    const { productVariantId, quantity } = input;

    // 1. Verify the variant exists and is active
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
    });

    if (!variant) {
      throw new NotFoundException(
        `Product variant "${productVariantId}" not found.`,
      );
    }

    if (!variant.isActive) {
      throw new BadRequestException(
        `Product variant "${productVariantId}" is not available.`,
      );
    }

    // 2. Fetch the existing cart item (if any) to compute the prospective total
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_productVariantId: { userId, productVariantId } },
    });

    const currentQty = existing?.quantity ?? 0;
    const prospectiveQty = currentQty + quantity;

    // 3. Stock validation against the prospective total
    if (prospectiveQty > variant.stock) {
      throw new BadRequestException(
        `Insufficient stock. ` +
          `You already have ${currentQty} in your cart. ` +
          `Adding ${quantity} more would reach ${prospectiveQty}, ` +
          `but only ${variant.stock} unit(s) are available.`,
      );
    }

    // 4. Upsert — create a new row or increment the existing quantity atomically
    return this.prisma.cartItem.upsert({
      where: { userId_productVariantId: { userId, productVariantId } },
      create: { userId, productVariantId, quantity },
      update: { quantity: { increment: quantity } },
    });
  }

  async updateCartItemQuantity(userId: string, input: UpdateCartItemInput) {
    const { productVariantId, quantity } = input;

    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_productVariantId: { userId, productVariantId } },
    });

    if (!existing) {
      throw new NotFoundException(
        `Cart item for variant "${productVariantId}" not found.`,
      );
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: productVariantId },
    });

    if (quantity > variant!.stock) {
      throw new BadRequestException(
        `Insufficient stock. Requested ${quantity} unit(s) but only ${variant!.stock} available.`,
      );
    }

    return this.prisma.cartItem.update({
      where: { userId_productVariantId: { userId, productVariantId } },
      data: { quantity },
    });
  }

  async clearCart(userId: string) {
    const { count } = await this.prisma.cartItem.deleteMany({ where: { userId } });
    return count;
  }

  async removeItemFromCart(userId: string, productVariantId: string) {
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_productVariantId: { userId, productVariantId } },
    });

    if (!existing) {
      throw new NotFoundException(
        `Cart item for variant "${productVariantId}" not found.`,
      );
    }

    return this.prisma.cartItem.delete({
      where: { userId_productVariantId: { userId, productVariantId } },
    });
  }
}
