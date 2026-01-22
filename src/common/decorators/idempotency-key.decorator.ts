import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';

export const IdempotencyKey = createParamDecorator(
  (required: boolean = true, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers['idempotency-key'] as
      | string
      | undefined;

    if (required && !idempotencyKey) {
      throw new BadRequestException({
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for this request',
      });
    }

    return idempotencyKey;
  },
);
