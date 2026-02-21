import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { OrderItem } from './order-item.model.js';
import { OrderStatus } from './order-status.model.js';
import { Payment } from './payment.model.js';
import { ShippingAddress } from '../../shipping-addresses/models/shipping-address.model.js';

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

  @Field(() => String, { nullable: true })
  assignedDeliveryId: string | null;

  @Field(() => String, { nullable: true })
  shippingAddressId: string | null;

  @Field(() => ShippingAddress, { nullable: true })
  shippingAddress?: ShippingAddress | null;

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

  @Field(() => [OrderItem], { nullable: true, description: 'Line items included in this order.' })
  items?: OrderItem[];

  @Field(() => [Payment], { nullable: true, description: 'Payment attempts associated with this order.' })
  payments?: Payment[];

  @Field(() => [OrderStatus], { nullable: true, description: 'Full status transition history for this order.' })
  statuses?: OrderStatus[];
}
