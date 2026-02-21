import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED      = 'FIXED',
}

registerEnumType(DiscountType, {
  name: 'DiscountType',
  description: 'Whether the discount deducts a fixed cent amount or a percentage of the eligible subtotal.',
});

@ObjectType()
export class PromoCodeApplication {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  promoCodeId: string;

  @Field(() => ID, { description: 'The product this rule targets.' })
  productId: string;

  @Field(() => ID, {
    nullable: true,
    description:
      'When set, only this specific variant is eligible. ' +
      'When null, all variants of the product are eligible.',
  })
  productVariantId: string | null;
}

@ObjectType()
export class PromoCode {
  @Field(() => ID)
  id: string;

  @Field(() => String, { description: 'The code string customers enter at checkout.' })
  code: string;

  @Field(() => DiscountType)
  discountType: DiscountType;

  @Field(() => Int, {
    description:
      'For PERCENTAGE: percentage points (e.g. 10 = 10%). ' +
      'For FIXED: the discount amount in cents.',
  })
  discountValue: number;

  @Field(() => Date)
  expirationDate: Date;

  @Field(() => Int, {
    nullable: true,
    description: 'Maximum total redemptions allowed. Null means unlimited.',
  })
  usageLimit: number | null;

  @Field(() => Int)
  usedCount: number;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => Int, {
    nullable: true,
    description: 'Minimum cart total in cents required to redeem this code.',
  })
  minPurchaseAmountCents: number | null;

  @Field(() => ID, { nullable: true })
  campaignId: string | null;

  @Field(() => [PromoCodeApplication], {
    description: 'Scope rules defining which products/variants are eligible. Empty = store-wide.',
  })
  applications: PromoCodeApplication[];

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
