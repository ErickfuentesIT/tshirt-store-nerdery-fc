import { BadRequestException } from '@nestjs/common';
import { CartItemWithVariant } from '../types/cart-item-with-variant.type.js';

export function validateStock(cartItems: CartItemWithVariant[]): void {
  for (const item of cartItems) {
    if (item.productVariant.stock < item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for SKU "${item.productVariant.sku}". ` +
          `Requested: ${item.quantity}, available: ${item.productVariant.stock}.`,
      );
    }
  }
}
