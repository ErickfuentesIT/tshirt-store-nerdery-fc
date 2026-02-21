import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ProductVariant } from '../../products/models/product-variant.model.js';
import { OrderItem } from '../models/order-item.model.js';
import { OrderItemVariantLoader } from '../loaders/order-item-variant.loader.js';

@Resolver(() => OrderItem)
export class OrderItemsResolver {
  constructor(
    private readonly orderItemVariantLoader: OrderItemVariantLoader,
  ) {}

  // ─── Field Resolvers ─────────────────────────────────────────────────────────

  @ResolveField(() => ProductVariant, { nullable: true })
  variant(@Parent() orderItem: OrderItem) {
    return this.orderItemVariantLoader.loader.load(orderItem.variantId);
  }
}
