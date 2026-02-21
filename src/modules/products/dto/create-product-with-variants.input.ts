import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateVariantInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  priceCents: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  stock: number;

  @Field(() => [String], {
    description: 'Attribute IDs (values like "Red", "S") to assign to this variant.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  attributeValueIds: string[];

  @Field(() => [String], {
    description: 'S3 image keys (from getSignedUrl) to link to this variant.',
  })
  @IsArray()
  @IsString({ each: true })
  imageKeys: string[];
}

@InputType()
export class CreateProductWithVariantsInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  basePrice: number;

  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @Field(() => [CreateVariantInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateVariantInput)
  variants: CreateVariantInput[];
}
