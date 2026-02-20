import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ShippingAddress {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  recipientName: string;

  @Field(() => String)
  phoneNumber: string;

  @Field(() => String, { nullable: true, description: 'e.g. "Home" or "Office"' })
  label: string | null;

  @Field(() => String)
  street: string;

  @Field(() => String)
  city: string;

  @Field(() => String)
  state: string;

  @Field(() => String)
  country: string;

  @Field(() => String, { nullable: true })
  additionalDescription: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
