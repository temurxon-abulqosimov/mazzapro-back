import { Injectable, Logger } from '@nestjs/common';
import {
  IPaymentService,
  CapturePaymentResult,
  RefundPaymentResult,
  SetupIntentResult,
} from './payment.interface';

/**
 * Mock Payment Service
 *
 * Used for development and testing when real payments are not needed.
 * Simulates successful payment operations without calling Stripe.
 * Enable by setting PAYMENTS_ENABLED=mock in .env
 */
@Injectable()
export class MockPaymentService implements IPaymentService {
  private readonly logger = new Logger(MockPaymentService.name);

  constructor() {
    this.logger.warn(
      '⚠️  MOCK PAYMENTS ENABLED - For development only! ' +
        'All payments will succeed automatically without real charges.',
    );
  }

  isEnabled(): boolean {
    return true; // Mock service is "enabled" for testing flows
  }

  async capturePayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    idempotencyKey: string,
    metadata?: Record<string, string>,
  ): Promise<CapturePaymentResult> {
    this.logger.log({
      message: '✅ Mock payment captured successfully',
      amount,
      currency,
      idempotencyKey,
      bookingId: metadata?.bookingId,
    });

    // Simulate successful payment with mock transaction ID
    return {
      success: true,
      transactionId: `mock_txn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      last4: '4242', // Mock card last 4 digits
      cardBrand: 'visa', // Mock card brand
    };
  }

  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundPaymentResult> {
    this.logger.log({
      message: '✅ Mock refund processed successfully',
      transactionId,
      amount,
      reason,
    });

    return {
      success: true,
      refundId: `mock_refund_${Date.now()}`,
    };
  }

  async createSetupIntent(customerId?: string): Promise<SetupIntentResult> {
    this.logger.log({
      message: '✅ Mock setup intent created',
      customerId,
    });

    return {
      clientSecret: `mock_seti_secret_${Date.now()}`,
    };
  }
}
