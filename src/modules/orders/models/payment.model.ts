import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum PaymentStatus {
  processing = 'processing',
  succeeded  = 'succeeded',
  failed     = 'failed',
  refunded   = 'refunded',
}

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'The status of a Stripe payment attempt.',
});

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  stripePaymentAttemptId: string | null;

  @Field(() => String)
  orderId: string;

  @Field(() => Int, { description: 'Amount charged in cents.' })
  amountCents: number;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field(() => String, { description: 'ISO 4217 currency code, e.g. "usd".' })
  currency: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
