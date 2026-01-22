import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  IPaymentService,
  CapturePaymentResult,
  RefundPaymentResult,
  SetupIntentResult,
} from './payment.interface';

/**
 * Stripe Payment Service
 *
 * Production implementation of IPaymentService using Stripe.
 * Only instantiated when PAYMENTS_ENABLED=true.
 */
@Injectable()
export class StripePaymentService implements IPaymentService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripePaymentService.name);

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('stripe.secretKey');

    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is required when payments are enabled',
      );
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });

    this.logger.log('Stripe payment service initialized');
  }

  isEnabled(): boolean {
    return true;
  }

  async capturePayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    idempotencyKey: string,
    metadata?: Record<string, string>,
  ): Promise<CapturePaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount,
          currency: currency.toLowerCase(),
          payment_method: paymentMethodId,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          metadata: metadata || {},
        },
        {
          idempotencyKey,
        },
      );

      if (paymentIntent.status === 'succeeded') {
        const paymentMethod = await this.stripe.paymentMethods.retrieve(
          paymentMethodId,
        );

        return {
          success: true,
          transactionId: paymentIntent.id,
          last4: paymentMethod.card?.last4,
          cardBrand: paymentMethod.card?.brand,
        };
      }

      return {
        success: false,
        error: `Payment status: ${paymentIntent.status}`,
      };
    } catch (error) {
      this.logger.error({
        message: 'Payment capture failed',
        amount,
        currency,
        idempotencyKey,
        bookingId: metadata?.bookingId,
        orderNumber: metadata?.orderNumber,
        userId: metadata?.userId,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stripeErrorCode: error instanceof Stripe.errors.StripeError ? error.code : undefined,
        stripeErrorType: error instanceof Stripe.errors.StripeError ? error.type : undefined,
      });

      if (error instanceof Stripe.errors.StripeError) {
        return {
          success: false,
          error: error.message,
        };
      }

      throw error;
    }
  }

  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<RefundPaymentResult> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: transactionId,
        reason: 'requested_by_customer',
      };

      if (amount) {
        refundParams.amount = amount;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
      };
    } catch (error) {
      this.logger.error({
        message: 'Refund failed',
        transactionId,
        amount,
        reason,
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stripeErrorCode: error instanceof Stripe.errors.StripeError ? error.code : undefined,
      });

      if (error instanceof Stripe.errors.StripeError) {
        return {
          success: false,
          error: error.message,
        };
      }

      throw error;
    }
  }

  async createSetupIntent(customerId?: string): Promise<SetupIntentResult> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return {
      clientSecret: setupIntent.client_secret || '',
    };
  }
}
