import { Field, ID, ObjectType } from '@nestjs/graphql';
import { OrderState } from './order.model.js';

@ObjectType()
export class OrderStatus {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  orderId: string;

  @Field(() => OrderState)
  status: OrderState;

  @Field(() => Date)
  createdAt: Date;
}
