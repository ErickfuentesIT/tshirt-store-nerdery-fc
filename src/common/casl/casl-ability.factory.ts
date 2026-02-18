import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { Action, AppAbility } from './casl.types.js';
import { Like } from '../../modules/likes/models/like.model.js';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { role: string }): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === 'manager') {
      can(Action.Manage, 'all');
      // managers run the store — liking products is a client-only action
      cannot(Action.Manage, Like);
    } else if (user.role === 'client') {
      can(Action.Read, 'all');
      can(Action.Create, Like);
      can(Action.Delete, Like);
    } else {
      // delivery: read-only, no access to likes
      can(Action.Read, 'all');
      cannot(Action.Read, Like);
    }

    return build();
  }
}
