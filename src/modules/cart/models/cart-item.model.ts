import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ProductVariant } from '../../products/models/product-variant.model.js';

@ObjectType()
export class CartItem {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  productVariantId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => ProductVariant, { nullable: true })
  productVariant?: ProductVariant;
}
