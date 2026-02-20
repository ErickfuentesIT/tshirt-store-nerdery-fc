import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Action, AppAbility } from './casl.types.js';
import { Like } from '../../modules/likes/models/like.model.js';
import { CartItem } from '../../modules/cart/models/cart-item.model.js';
import { ShippingAddress } from '../../modules/shipping-addresses/models/shipping-address.model.js';
import { Order } from '../../modules/orders/models/order.model.js';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { role: string }): AppAbility {
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
    } else {
      // delivery: read-only, no access to likes or cart
      can(Action.Read, 'all');
      cannot(Action.Read, Like);
      cannot(Action.Read, CartItem);
    }

    return build();
  }
}
