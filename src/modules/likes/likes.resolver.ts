import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard.js';
import { PoliciesGuard } from '../../common/guards/policies.guard.js';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserType } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../../common/casl/casl.types.js';
import { Like } from './models/like.model.js';
import { LikesService } from './likes.service.js';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Resolver(() => Like)
export class LikesResolver {
  constructor(private readonly likesService: LikesService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Read, Like))
  @Query(() => [Like], {
    name: 'myLikes',
    description:
      'Returns all product variants liked by the currently authenticated client.',
  })
  async findUserLikes(@CurrentUser() user: CurrentUserType) {
    return this.likesService.findUserLikes(user.userId);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  @CheckPolicies((ability) => ability.can(Action.Create, Like))
  @Mutation(() => Like, {
    description:
      'Likes a product variant. A client can only like a given variant once.',
  })
  async likeVariant(
    @Args('productVariantId', { type: () => ID }) productVariantId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.likesService.like(user.userId, productVariantId);
  }

  @CheckPolicies((ability) => ability.can(Action.Delete, Like))
  @Mutation(() => Like, {
    description: 'Removes a like from a product variant.',
  })
  async unlikeVariant(
    @Args('productVariantId', { type: () => ID }) productVariantId: string,
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.likesService.unlike(user.userId, productVariantId);
  }
}
