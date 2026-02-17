import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class UpdateAttributeCategoryInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  name?: string;
}
