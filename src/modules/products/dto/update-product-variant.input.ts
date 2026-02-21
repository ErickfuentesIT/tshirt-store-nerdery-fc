import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, IsPositive, Min } from 'class-validator';
@InputType()
export class UpdateProductVariantInput {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  priceCents?: number;
}
