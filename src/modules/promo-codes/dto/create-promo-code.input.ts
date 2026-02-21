import { InputType, Field, ID, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType } from '../models/promo-code.model.js';

@InputType()
export class PromoCodeApplicationInput {
  @Field(() => ID, { description: 'Product this rule targets.' })
  @IsUUID()
  productId: string;

  @Field(() => ID, {
    nullable: true,
    description:
      'Specific variant to restrict to. Omit to cover all variants of the product.',
  })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;
}

@InputType()
export class CreatePromoCodeInput {
  @Field(() => String, { description: 'The unique code string customers enter at checkout.' })
  @IsString()
  code: string;

  @Field(() => DiscountType)
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @Field(() => Int, {
    description:
      'For PERCENTAGE: percentage points (e.g. 10 = 10%). ' +
      'For FIXED: the discount amount in cents.',
  })
  @IsInt()
  @IsPositive()
  discountValue: number;

  @Field(() => Date, { description: 'UTC datetime after which the code is no longer redeemable.' })
  expirationDate: Date;

  @Field(() => Int, {
    nullable: true,
    description: 'Maximum total redemptions. Omit for unlimited usage.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  usageLimit?: number;

  @Field(() => Int, {
    nullable: true,
    description: 'Minimum cart total in cents required to apply this code.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minPurchaseAmountCents?: number;

  @Field(() => ID, { nullable: true, description: 'Campaign to associate this code with.' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @Field(() => [PromoCodeApplicationInput], {
    description:
      'Products or variants this code applies to. ' +
      'Pass an empty array to create a store-wide code.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromoCodeApplicationInput)
  applications: PromoCodeApplicationInput[];
}
