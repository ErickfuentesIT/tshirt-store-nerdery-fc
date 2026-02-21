import { InputType, Field } from '@nestjs/graphql';
import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVariantInput } from './create-product-with-variants.input.js';

@InputType()
export class AddVariantsInput {
  @Field(() => [CreateVariantInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantInput)
  variants: CreateVariantInput[];
}
