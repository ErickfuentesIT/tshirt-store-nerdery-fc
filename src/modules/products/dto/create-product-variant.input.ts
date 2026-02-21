import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';
@InputType()
export class CreateProductVariantInput {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  sku: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  stock: number;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  priceCents: number;
}
