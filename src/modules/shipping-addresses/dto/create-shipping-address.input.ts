import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateShippingAddressInput {
  @Field(() => String, { description: 'Full name of the person receiving the order.' })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @Field(() => String, { description: 'Contact phone number for the recipient.' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @Field(() => String, { nullable: true, description: 'Optional label, e.g. "Home" or "Office".' })
  @IsString()
  @IsOptional()
  label?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  street: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  city: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  state: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  country: string;

  @Field(() => String, { nullable: true, description: 'Additional delivery instructions.' })
  @IsString()
  @IsOptional()
  additionalDescription?: string;
}
