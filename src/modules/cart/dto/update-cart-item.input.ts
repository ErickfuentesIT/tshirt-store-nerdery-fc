import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsUUID, IsInt, IsPositive } from 'class-validator';

@InputType()
export class UpdateCartItemInput {
  @Field(() => ID, { description: 'ID of the product variant to update in the cart.' })
  @IsUUID()
  productVariantId: string;

  @Field(() => Int, { description: 'New absolute quantity. Must be a positive integer. Use removeItemFromCart to delete the item entirely.' })
  @IsInt()
  @IsPositive()
  quantity: number;
}
