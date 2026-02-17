import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SignedUrlResponse {
  @Field(() => String)
  signedUrl: string;

  @Field(() => String)
  key: string;

  @Field(() => String)
  publicUrl: string;
}
