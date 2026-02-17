import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Image {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  imageUrl: string;

  @Field(() => Date)
  createdAt: Date;
}
