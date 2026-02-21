import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class CreateImageInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  imageKey: string;

  @Field(() => String, { nullable: true })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @Field(() => String, { nullable: true })
  @IsUUID()
  @IsOptional()
  variantId?: string;
}
