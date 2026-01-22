import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentService,
  CapturePaymentResult,
  RefundPaymentResult,
  SetupIntentResult,
} from './payment.interface';

/**
 * Null Payment Service
 *
 * Used when payments are disabled (PAYMENTS_ENABLED=false).
 * All operations return graceful failures with clear error messages.
 * This allows the app to boot and pass health checks without Stripe credentials.
 */
@Injectable()
export class NullPaymentService implements IPaymentService {
  private readonly logger = new Logger(NullPaymentService.name);

  constructor() {
    this.logger.warn(
      'Payments are DISABLED. NullPaymentService is active. ' +
        'Set PAYMENTS_ENABLED=true and configure Stripe credentials to enable payments.',
    );
  }

  isEnabled(): boolean {
    return false;
  }

  async capturePayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    idempotencyKey: string,
    metadata?: Record<string, string>,
  ): Promise<CapturePaymentResult> {
    this.logger.warn({
      message: 'Payment capture attempted while payments disabled',
      amount,
      currency,
      idempotencyKey,
      bookingId: metadata?.bookingId,
    });

    return {
      success: false,
      error: 'Payments are currently disabled. Please try again later.',
    };
  }

  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundPaymentResult> {
    this.logger.warn({
      message: 'Refund attempted while payments disabled',
      transactionId,
      amount,
      reason,
    });

    return {
      success: false,
      error: 'Payments are currently disabled. Refund cannot be processed.',
    };
  }

  async createSetupIntent(customerId?: string): Promise<SetupIntentResult> {
    this.logger.warn({
      message: 'Setup intent creation attempted while payments disabled',
      customerId,
    });

    return {
      clientSecret: '',
    };
  }
}
