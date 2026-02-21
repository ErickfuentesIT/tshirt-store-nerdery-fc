import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../../common/casl/casl.types.js';
import { CartItem } from './models/cart-item.model.js';
import { CartService } from './cart.service.js';
import { AddItemToCartInput } from './dto/add-item-to-cart.input.js';
import { UpdateCartItemInput } from './dto/update-cart-item.input.js';
import { CartItemVariantLoader } from './loaders/cart-item-variant.loader.js';
import { ProductVariant } from '../products/models/product-variant.model.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => CartItem)
export class CartResolver {
  constructor(
    private readonly cartService: CartService,
    private readonly cartItemVariantLoader: CartItemVariantLoader,
  ) {}

  // ─── Queries ─────────────────────────────────────────────────────────────────


  @CheckPolicies((ability) => ability.can(Action.Read, CartItem))
  @Query(() => [CartItem], {
    name: 'cart',
    description: "Returns all items in the authenticated client's cart, ordered by insertion date.",
  })
  async getCart(@CurrentUser() user: CurrentUserType) {
    return this.cartService.getCart(user.userId);
  }

  // ─── Field Resolvers ─────────────────────────────────────────────────────────

  @ResolveField(() => ProductVariant, { nullable: true })
  async productVariant(@Parent() cartItem: CartItem) {
    return this.cartItemVariantLoader.loader.load(cartItem.productVariantId);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Create, CartItem))
  @Mutation(() => CartItem, {
    description:
      "Adds a product variant to the authenticated client's cart. " +
      'If the variant is already in the cart, its quantity is incremented. ' +
      'Throws if stock is insufficient or the variant is inactive.',
  })
  async addItemToCart(
    @Args('data') data: AddItemToCartInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cartService.addItemToCart(user.userId, data);
  }

  @CheckPolicies((ability) => ability.can(Action.Update, CartItem))
  @Mutation(() => CartItem, {
    description:
      "Sets the quantity of a cart item to an absolute value. " +
      'Use this to change the quantity from any number to another (e.g. 5 → 1). ' +
      'Throws if the item is not in the cart or stock is insufficient.',
  })
  async updateCartItemQuantity(
    @Args('data') data: UpdateCartItemInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cartService.updateCartItemQuantity(user.userId, data);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, CartItem))
  @Mutation(() => Int, {
    description:
      "Hard-deletes all items from the authenticated client's cart. Returns the number of deleted items.",
  })
  async clearCart(@CurrentUser() user: CurrentUserType) {
    return this.cartService.clearCart(user.userId);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, CartItem))
  @Mutation(() => CartItem, {
    description:
      "Hard-deletes a product variant from the authenticated client's cart.",
  })
  async removeItemFromCart(
    @Args('productVariantId', { type: () => ID }) productVariantId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.cartService.removeItemFromCart(user.userId, productVariantId);
  }
}
