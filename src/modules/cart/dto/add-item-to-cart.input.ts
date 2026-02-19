import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID, IsInt, IsPositive } from 'class-validator';

@InputType()
export class AddItemToCartInput {
  @Field(() => ID, { description: 'ID of the product variant to add to the cart.' })
  @IsUUID()
  productVariantId: string;

  @Field(() => Int, { description: 'Number of units to add. Must be a positive integer.' })
  @IsInt()
  @IsPositive()
  quantity: number;
}
