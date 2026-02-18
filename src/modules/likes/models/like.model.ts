import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Like {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  userId: string;

  @Field(() => String)
  productVariantId: string;

  @Field(() => Date)
  createdAt: Date;
}
