import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser, AuthenticatedRequest } from '@common/types';

export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (data) {
      return user[data] as string;
    }

    return user;
  },
);
