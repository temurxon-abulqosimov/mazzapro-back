import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  enabled: boolean | 'mock';
  secretKey: string;
  webhookSecret: string;
  apiVersion: '2023-10-16';
}

export const stripeConfig = registerAs('stripe', (): StripeConfig => {
  // Check both variable names, prioritize STRIPE_ENABLED as per .env
  const envValue = process.env.STRIPE_ENABLED || process.env.PAYMENTS_ENABLED;

  let enabled: boolean | 'mock' = false;

  if (envValue === 'mock') {
    enabled = 'mock';
  } else if (envValue === 'true') {
    enabled = true;
  } else if (process.env.NODE_ENV !== 'production' && envValue !== 'false') {
    // Default to false (null service) instead of true to avoid unintentional successful mocks in dev unless explicit
    enabled = false;
    // Wait, original logic was: default to true in dev if not false?
    // "process.env.NODE_ENV !== 'production' && process.env.PAYMENTS_ENABLED !== 'false'"
    // This evaluates to TRUE. So original default was TRUE.
    // If I want to match original logic but support mock:
    if (process.env.NODE_ENV !== 'production') {
      // If it was undefined, original logic made it true.
      // Let's keep it safe: if 'mock', it's mock. If 'true', it's true. Else false.
      // But user wants mock.
      // Let's set enabled to 'mock' if undefined in dev? 
      // No, safer to respect the explicit env var.
      // The user has STRIPE_ENABLED=mock in .env. So envValue WILL be 'mock'.
    }
  }

  // Simplified logic:
  if (envValue === 'mock') {
    enabled = 'mock';
  } else {
    enabled = envValue === 'true' || (process.env.NODE_ENV !== 'production' && envValue !== 'false');
  }

  return {
    enabled,
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: '2023-10-16' as const,
  };
});
