import { SetMetadata } from '@nestjs/common';
import { AppAbility } from '../casl/casl.types.js';

export const CHECK_POLICIES_KEY = 'check_policies';

export type PolicyHandlerFn = (ability: AppAbility) => boolean;

export const CheckPolicies = (...handlers: PolicyHandlerFn[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
