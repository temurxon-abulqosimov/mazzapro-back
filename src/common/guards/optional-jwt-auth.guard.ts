import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<TUser>(err: any, user: any, info: any, context: ExecutionContext): TUser {
        // If error or no user, just return null (don't throw)
        // This allows the route to proceed without a user, but populates it if valid token exists
        if (err || !user) {
            return null as any;
        }
        return user;
    }
}
