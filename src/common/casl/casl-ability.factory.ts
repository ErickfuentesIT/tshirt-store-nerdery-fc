import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Action, AppAbility } from './casl.types.js';
import { Like } from '../../modules/likes/models/like.model.js';
import { CartItem } from '../../modules/cart/models/cart-item.model.js';
import { ShippingAddress } from '../../modules/shipping-addresses/models/shipping-address.model.js';
import { Order, OrderState } from '../../modules/orders/models/order.model.js';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { role: string; userId: string }): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === 'manager') {
      can(Action.Manage, 'all');
      // managers run the store — liking products, managing carts, and placing orders are client-only actions
      cannot(Action.Manage, Like);
      cannot(Action.Manage, CartItem);
      cannot(Action.Create, Order);
    } else if (user.role === 'client') {
      can(Action.Read, 'all');
      can(Action.Create, Like);
      can(Action.Delete, Like);
      can(Action.Read, CartItem);
      can(Action.Create, CartItem);
      can(Action.Update, CartItem);
      can(Action.Delete, CartItem);
      can(Action.Read, ShippingAddress);
      can(Action.Create, ShippingAddress);
      can(Action.Update, ShippingAddress);
      can(Action.Delete, ShippingAddress);
      can(Action.Create, Order);
      // Scope Order access to the client's own orders.
      // `cannot` overrides the broad `can(Read, 'all')` for Order specifically;
      // the subsequent `can` restores read with a userId condition.
      // CASL evaluates rules in definition order — later rules take precedence.
      cannot(Action.Read, Order);
      can(Action.Read, Order, { userId: user.userId });
      can(Action.Update, Order, { userId: user.userId });
    } else if (user.role === 'delivery') {
      // Delivery persons may only see and update orders that are assigned to
      // them AND currently in 'shipped' status.
      // These conditions are evaluated by CASL when ability.can() is called
      // with an actual Order instance (e.g. in service-level checks).
      // The PoliciesGuard uses a subject-type check (no instance), which acts
      // as a coarse first layer; the service enforces the full conditions.
      can(Action.Read, Order, {
        assignedDeliveryId: user.userId,
        currentStatus: OrderState.shipped,
      });
      can(Action.Update, Order, {
        assignedDeliveryId: user.userId,
        currentStatus: OrderState.shipped,
      });
    }

    return build();
  }
}
