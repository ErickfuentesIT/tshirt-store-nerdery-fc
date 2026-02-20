import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ProductVariant } from '../../products/models/product-variant.model.js';

@ObjectType()
export class OrderItem {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  orderId: string;

  @Field(() => String)
  variantId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int, { description: 'Unit price at time of purchase, in cents.' })
  priceAtPurchaseCents: number;

  @Field(() => Int, { nullable: true, description: 'Item-level discount in cents, if any.' })
  discountAmountCents: number | null;

  @Field(() => ProductVariant, { nullable: true })
  variant?: ProductVariant;
}
