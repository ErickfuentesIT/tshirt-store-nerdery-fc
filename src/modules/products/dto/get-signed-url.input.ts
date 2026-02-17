import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class GetSignedUrlInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  contentType: string;
}
