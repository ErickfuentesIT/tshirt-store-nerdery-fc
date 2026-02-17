import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class UpdateAttributeInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  name?: string;
}
