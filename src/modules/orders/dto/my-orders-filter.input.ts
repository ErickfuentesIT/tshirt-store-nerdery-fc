import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsDate, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderState } from '../models/order.model.js';

@InputType()
export class MyOrdersFilterInput {
  @Field(() => Date, { nullable: true, description: 'Return orders created on or after this date.' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @Field(() => Date, { nullable: true, description: 'Return orders created on or before this date.' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

  @Field(() => OrderState, { nullable: true, description: 'Filter by a specific order status.' })
  @IsOptional()
  @IsEnum(OrderState)
  status?: OrderState;

  @Field(() => Int, { nullable: true, description: 'Minimum order total in cents (inclusive).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  minAmountCents?: number;

  @Field(() => Int, { nullable: true, description: 'Maximum order total in cents (inclusive).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAmountCents?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10, description: 'Maximum number of orders to return.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0, description: 'Number of orders to skip.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
