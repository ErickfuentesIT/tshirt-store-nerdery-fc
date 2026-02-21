import { UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../../common/decorators/check-policies.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { CurrentUserType } from '../../../common/decorators/current-user.decorator.js';
import { Action } from '../../../common/casl/casl.types.js';
import { Order } from '../models/order.model.js';
import { OrderItem } from '../models/order-item.model.js';
import { Payment } from '../models/payment.model.js';
import { OrdersService } from '../services/orders.service.js';
import { CheckoutPayload } from '../dto/checkout-payload.dto.js';
import { MyOrdersFilterInput } from '../dto/my-orders-filter.input.js';
import { AssignDeliveryInput } from '../dto/assign-delivery.input.js';
import { OrderItemsLoader } from '../loaders/order-items.loader.js';
import { OrderPaymentsLoader } from '../loaders/order-payments.loader.js';
import { OrderShippingAddressLoader } from '../loaders/order-shipping-address.loader.js';
import { OrderStatusesLoader } from '../loaders/order-statuses.loader.js';
import { ShippingAddress } from '../../shipping-addresses/models/shipping-address.model.js';
import { OrderStatus } from '../models/order-status.model.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => Order)
export class OrdersResolver {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderItemsLoader: OrderItemsLoader,
    private readonly orderPaymentsLoader: OrderPaymentsLoader,
    private readonly orderShippingAddressLoader: OrderShippingAddressLoader,
    private readonly orderStatusesLoader: OrderStatusesLoader,
  ) {}

  // ─── Queries ─────────────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Manage, Order))
  @Query(() => [Order], {
    name: 'orders',
    description: 'Returns all orders in the system. Restricted to managers.',
  })
  orders() {
    return this.ordersService.findAll();
  }

  @CheckPolicies((ability) => ability.can(Action.Create, Order))
  @Query(() => [Order], {
    name: 'myOrders',
    description: 'Returns all orders placed by the authenticated client.',
  })
  myOrders(
    @CurrentUser() user: CurrentUserType,
    @Args('filters', { type: () => MyOrdersFilterInput, nullable: true })
    filters?: MyOrdersFilterInput,
  ) {
    return this.ordersService.findAllForUser(user.userId, filters ?? {});
  }

  // ─── Field Resolvers ───────────────────────────────────────────────────────────

  @ResolveField(() => [OrderItem], { nullable: true })
  items(@Parent() order: Order) {
    return this.orderItemsLoader.loader.load(order.id);
  }

  @ResolveField(() => [Payment], { nullable: true })
  payments(@Parent() order: Order) {
    return this.orderPaymentsLoader.loader.load(order.id);
  }

  @ResolveField(() => ShippingAddress, { nullable: true })
  shippingAddress(@Parent() order: Order) {
    if (!order.shippingAddressId) return null;
    return this.orderShippingAddressLoader.loader.load(order.shippingAddressId);
  }

  @ResolveField(() => [OrderStatus], { nullable: true })
  statuses(@Parent() order: Order) {
    return this.orderStatusesLoader.loader.load(order.id);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

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

  @CheckPolicies((ability) => ability.can(Action.Manage, Order))
  @Mutation(() => Int, {
    description:
      'Assigns a delivery driver to a batch of paid orders and advances ' +
      'their status to processing. All orders must currently be in paid status — ' +
      'if any are not, the entire batch is rejected. Restricted to managers.',
  })
  markOrdersAsProcessing(
    @Args('data') data: AssignDeliveryInput,
    @CurrentUser() user: CurrentUserType,
  ): Promise<number> {
    return this.ordersService.assignDeliveryAndMarkProcessing(data, user.userId);
  }

  @CheckPolicies((ability) => ability.can(Action.Manage, Order))
  @Mutation(() => Order, {
    description:
      'Advances a single order from processing to shipped. ' +
      'The order must be in processing status — any other state is rejected ' +
      'with an explanation of why the transition is invalid. Restricted to managers.',
  })
  markOrderAsShipped(
    @Args('orderId', { type: () => ID }) orderId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.ordersService.markOrderAsShipped(orderId, user.userId);
  }

  // ─── Client Mutations ────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Update, Order))
  @Mutation(() => Order, {
    description:
      'Cancels the authenticated client\'s own order. ' +
      'Only orders in pending, paid, or processing status can be cancelled — ' +
      'shipped, delivered, and already-cancelled orders are rejected.',
  })
  cancelMyOrder(
    @Args('orderId', { type: () => ID }) orderId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.ordersService.cancelOrder(orderId, user.userId);
  }

  // ─── Delivery Person ─────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Read, Order))
  @Query(() => [Order], {
    name: 'myAssignedDeliveries',
    description:
      'Returns all orders assigned to the authenticated delivery person ' +
      'that are currently in shipped status. Restricted to delivery role.',
  })
  myAssignedDeliveries(@CurrentUser() user: CurrentUserType) {
    return this.ordersService.getMyAssignedDeliveries(user.userId);
  }

  @CheckPolicies((ability) => ability.can(Action.Update, Order))
  @Mutation(() => Order, {
    description:
      'Marks a shipped order as delivered. The order must be assigned to ' +
      'the authenticated delivery person and currently in shipped status. ' +
      'Restricted to delivery role.',
  })
  markOrderAsDelivered(
    @Args('orderId', { type: () => ID }) orderId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.ordersService.markOrderAsDelivered(orderId, user.userId);
  }

}
