import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class CreateAttributeCategoryInput {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  attributeId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  value: string;
}
