import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class CreateAttributeInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;
}
