import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  enabled: boolean;
  secretKey: string;
  webhookSecret: string;
  apiVersion: '2023-10-16';
}

export const stripeConfig = registerAs('stripe', (): StripeConfig => {
  // Feature flag: PAYMENTS_ENABLED controls whether Stripe is active
  // Default to false in production if not explicitly set
  const enabled =
    process.env.PAYMENTS_ENABLED === 'true' ||
    (process.env.NODE_ENV !== 'production' &&
      process.env.PAYMENTS_ENABLED !== 'false');

  return {
    enabled,
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: '2023-10-16' as const,
  };
});
