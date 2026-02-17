import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Image } from './image.model.js';

@ObjectType()
export class ProductVariant {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  productId: string;

  @Field(() => String)
  sku: string;

  @Field(() => Int)
  stock: number;

  @Field(() => Int)
  priceCents: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => [Image], { nullable: true })
  images?: Image[];
}
