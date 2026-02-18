import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Action, AppAbility } from './casl.types.js';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { role: string }): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === 'manager') {
      can(Action.Manage, 'all');
    } else {
      // client and delivery: read-only
      can(Action.Read, 'all');
    }

    return build();
  }
}
