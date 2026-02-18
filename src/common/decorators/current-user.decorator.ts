import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export type CurrentUserType = {
  userId: string;
  username: string;
  role: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserType => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
