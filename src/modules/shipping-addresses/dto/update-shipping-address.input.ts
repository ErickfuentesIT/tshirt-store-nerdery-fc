import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';
import { CreateShippingAddressInput } from './create-shipping-address.input.js';

@InputType()
export class UpdateShippingAddressInput extends PartialType(
  CreateShippingAddressInput,
) {
  @Field(() => ID, { description: 'ID of the address to update.' })
  @IsUUID()
  id: string;
}
