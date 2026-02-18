import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { CaslAbilityFactory } from '../casl/casl-ability.factory.js';
import { CHECK_POLICIES_KEY, PolicyHandlerFn } from '../decorators/check-policies.decorator.js';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handlers = this.reflector.getAllAndOverride<PolicyHandlerFn[]>(
      CHECK_POLICIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!handlers?.length) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user;
    const ability = this.caslAbilityFactory.createForUser(user);

    const allowed = handlers.every((fn) => fn(ability));
    if (!allowed) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
