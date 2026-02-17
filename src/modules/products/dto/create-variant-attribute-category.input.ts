import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class CreateVariantAttributeCategoryInput {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  attributeId: string;
}
