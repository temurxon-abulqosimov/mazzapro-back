import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  OWNERSHIP_KEY,
  OwnershipConfig,
} from '@common/decorators/ownership.decorator';
import { AuthenticatedRequest, UserRole } from '@common/types';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const ownershipConfig = this.reflector.getAllAndOverride<OwnershipConfig>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!ownershipConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Admins bypass ownership checks
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const { paramName, userField } = ownershipConfig;
    const resourceOwnerId = request.params[paramName];
    const userOwnerId = userField === 'id' ? user.id : user[userField];

    if (resourceOwnerId !== userOwnerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
    }

    return true;
  }
}
