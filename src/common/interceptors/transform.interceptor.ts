import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@common/types';

export interface RawResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T | RawResponse<T>, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T | RawResponse<T>>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.requestId;

    return next.handle().pipe(
      map((response) => {
        if (this.isRawResponse(response)) {
          return {
            success: true,
            data: response.data,
            meta: {
              ...response.meta,
              requestId,
            },
          };
        }

        return {
          success: true,
          data: response as T,
          meta: {
            requestId,
          },
        };
      }),
    );
  }

  private isRawResponse(response: unknown): response is RawResponse<T> {
    return (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      Object.keys(response).every((key) => ['data', 'meta'].includes(key))
    );
  }
}
