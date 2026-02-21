import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator.js';
import { Action } from '../../common/casl/casl.types.js';
import { PromoCode } from './models/promo-code.model.js';
import { PromoCodesService } from './promo-codes.service.js';
import { CreatePromoCodeInput } from './dto/create-promo-code.input.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => PromoCode)
export class PromoCodesResolver {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  // ─── Mutations ───────────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Manage, PromoCode))
  @Mutation(() => PromoCode, {
    description:
      'Creates a new promo code and its product/variant scope rules. ' +
      'Pass an empty applications array for a store-wide code. ' +
      'Restricted to managers.',
  })
  createPromoCode(@Args('data') data: CreatePromoCodeInput) {
    return this.promoCodesService.createPromoCode(data);
  }

  @CheckPolicies((ability) => ability.can(Action.Manage, PromoCode))
  @Mutation(() => PromoCode, {
    description:
      'Flips the isActive flag of a promo code. ' +
      'Deactivating prevents any further redemptions without deleting the record. ' +
      'Restricted to managers.',
  })
  togglePromoCode(@Args('id', { type: () => ID }) id: string) {
    return this.promoCodesService.togglePromoCode(id);
  }
}
