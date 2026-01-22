import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { DomainException } from '@common/exceptions/domain.exception';
import { ApiErrorResponse, FieldError } from '@common/types';

interface RequestWithId extends Request {
  requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId || 'unknown';

    let status: number;
    let code: string;
    let message: string;
    let details: FieldError[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        code = (responseObj.code as string) || this.getCodeFromStatus(status);
        message =
          (responseObj.message as string) ||
          (Array.isArray(responseObj.message)
            ? responseObj.message[0]
            : exception.message);

        if (Array.isArray(responseObj.message)) {
          details = responseObj.message.map((msg: string) => ({
            field: this.extractFieldFromMessage(msg),
            message: msg,
          }));
        }
      } else {
        code = this.getCodeFromStatus(status);
        message = exceptionResponse as string;
      }
    } else if (exception instanceof DomainException) {
      status = this.getStatusFromDomainCode(exception.code);
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message =
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : exception.message;

      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        requestId,
      },
    };

    response.status(status).json(errorResponse);
  }

  private getCodeFromStatus(status: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return statusCodeMap[status] || 'UNKNOWN_ERROR';
  }

  private getStatusFromDomainCode(code: string): number {
    const codeStatusMap: Record<string, number> = {
      NOT_FOUND: HttpStatus.NOT_FOUND,
      INVALID_STATE_TRANSITION: HttpStatus.CONFLICT,
      INSUFFICIENT_STOCK: HttpStatus.CONFLICT,
      PRODUCT_EXPIRED: HttpStatus.CONFLICT,
      UNAUTHORIZED_ACCESS: HttpStatus.FORBIDDEN,
      PAYMENT_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
      DUPLICATE_BOOKING: HttpStatus.CONFLICT,
      INVALID_PICKUP_WINDOW: HttpStatus.BAD_REQUEST,
      SELLER_APPLICATION_PENDING: HttpStatus.FORBIDDEN,
      INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
      EMAIL_ALREADY_EXISTS: HttpStatus.CONFLICT,
      INVALID_TOKEN: HttpStatus.UNAUTHORIZED,
    };
    return codeStatusMap[code] || HttpStatus.BAD_REQUEST;
  }

  private extractFieldFromMessage(message: string): string {
    const match = message.match(/^(\w+)/);
    return match ? match[1].toLowerCase() : 'unknown';
  }
}
