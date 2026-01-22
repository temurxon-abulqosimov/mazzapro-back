/**
 * Payment Service Interface
 * Defines the contract for payment processing services
 */

export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');

export interface CapturePaymentResult {
  success: boolean;
  transactionId?: string;
  last4?: string;
  cardBrand?: string;
  error?: string;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

export interface SetupIntentResult {
  clientSecret: string;
}

export interface IPaymentService {
  /**
   * Whether the payment service is enabled and operational
   */
  isEnabled(): boolean;

  /**
   * Capture payment for a booking
   */
  capturePayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    idempotencyKey: string,
    metadata?: Record<string, string>,
  ): Promise<CapturePaymentResult>;

  /**
   * Refund a captured payment
   */
  refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundPaymentResult>;

  /**
   * Create a setup intent for saving payment methods
   */
  createSetupIntent(customerId?: string): Promise<SetupIntentResult>;
}
