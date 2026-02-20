import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../../common/casl/casl.types.js';
import { ShippingAddress } from './models/shipping-address.model.js';
import { ShippingAddressesService } from './shipping-addresses.service.js';
import { CreateShippingAddressInput } from './dto/create-shipping-address.input.js';
import { UpdateShippingAddressInput } from './dto/update-shipping-address.input.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => ShippingAddress)
export class ShippingAddressesResolver {
  constructor(
    private readonly shippingAddressesService: ShippingAddressesService,
  ) {}

  @CheckPolicies((ability) => ability.can(Action.Read, ShippingAddress))
  @Query(() => [ShippingAddress], {
    name: 'myAddresses',
    description: 'Returns all shipping addresses saved by the authenticated user.',
  })
  myAddresses(@CurrentUser() user: CurrentUserType) {
    return this.shippingAddressesService.findAllForUser(user.userId);
  }

  @CheckPolicies((ability) => ability.can(Action.Create, ShippingAddress))
  @Mutation(() => ShippingAddress, {
    description: 'Saves a new shipping address for the authenticated user.',
  })
  createShippingAddress(
    @Args('data') data: CreateShippingAddressInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.shippingAddressesService.create(user.userId, data);
  }

  @CheckPolicies((ability) => ability.can(Action.Update, ShippingAddress))
  @Mutation(() => ShippingAddress, {
    description:
      'Updates fields on an existing shipping address. ' +
      'Only the owner of the address may update it.',
  })
  updateShippingAddress(
    @Args('data') data: UpdateShippingAddressInput,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.shippingAddressesService.update(user.userId, data);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, ShippingAddress))
  @Mutation(() => ShippingAddress, {
    description:
      'Permanently deletes a shipping address. ' +
      'Only the owner of the address may delete it.',
  })
  deleteShippingAddress(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.shippingAddressesService.remove(user.userId, id);
  }
}
