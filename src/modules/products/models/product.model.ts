import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Category } from '../../categories/models/category.model.js';
import { ProductVariant } from '../../product-variants/models/product-variant.model.js';
import { Image } from '../../images/models/image.model.js';

@ObjectType()
export class Product {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Int)
  basePrice: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Category, { nullable: true })
  category?: Category;

  @Field(() => [ProductVariant], { nullable: true })
  variants?: ProductVariant[];

  @Field(() => [Image], { nullable: true })
  images?: Image[];
}
