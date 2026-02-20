import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../../common/casl/casl.types.js';
import { Order } from './models/order.model.js';
import { OrdersService } from './orders.service.js';
import { CheckoutPayload } from './dto/checkout-payload.dto.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver()
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @CheckPolicies((ability) => ability.can(Action.Create, Order))
  @Mutation(() => CheckoutPayload, {
    description:
      'Initiates a cart checkout for the authenticated user. ' +
      'Validates stock availability, creates a pending order in the database, ' +
      'and returns a Stripe client_secret for the frontend to complete ' +
      'payment using the Stripe Payment Element.',
  })
  async initiateCheckout(
    @Args('shippingAddressId', { type: () => ID })
    shippingAddressId: string,

    @Args('promoCode', { type: () => String, nullable: true })
    promoCode: string | undefined,

    @CurrentUser() user: CurrentUserType,
  ): Promise<CheckoutPayload> {
    return this.ordersService.initiateCartCheckout(
      user.userId,
      shippingAddressId,
      promoCode,
    );
  }
}
