import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum OrderState {
  pending    = 'pending',
  paid       = 'paid',
  processing = 'processing',
  cancelled  = 'cancelled',
  shipped    = 'shipped',
  delivered  = 'delivered',
}

export enum PaymentMethodType {
  payment_link   = 'payment_link',
  payment_intent = 'payment_intent',
}

registerEnumType(OrderState, {
  name: 'OrderState',
  description: 'The lifecycle state of an order.',
});

registerEnumType(PaymentMethodType, {
  name: 'PaymentMethodType',
  description: 'The Stripe payment method used to place the order.',
});

@ObjectType()
export class Order {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  userId: string | null;

  @Field(() => String, { nullable: true })
  guestEmail: string | null;

  @Field(() => PaymentMethodType)
  paymentMethodType: PaymentMethodType;

  @Field(() => OrderState)
  currentStatus: OrderState;

  @Field(() => Int, { description: 'Order total in cents.' })
  totalAmountCents: number;

  @Field(() => Int, { description: 'Discount applied in cents.' })
  discountAmountCents: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
