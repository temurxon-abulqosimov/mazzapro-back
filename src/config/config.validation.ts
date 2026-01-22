/**
 * Configuration validation utility
 * Validates required environment variables at startup
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Database validation
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasIndividualDbConfig =
    process.env.DATABASE_HOST &&
    process.env.DATABASE_PORT &&
    process.env.DATABASE_USERNAME &&
    process.env.DATABASE_NAME;

  if (!hasDatabaseUrl && !hasIndividualDbConfig) {
    errors.push(
      'Database configuration missing: Provide DATABASE_URL or individual fields (DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_NAME)',
    );
  }

  if (hasDatabaseUrl && hasIndividualDbConfig) {
    warnings.push(
      'Both DATABASE_URL and individual database fields are set. DATABASE_URL will be used.',
    );
  }

  // Redis validation
  const hasRedisUrl = !!process.env.REDIS_URL;
  const hasIndividualRedisConfig = !!process.env.REDIS_HOST;

  if (!hasRedisUrl && !hasIndividualRedisConfig) {
    warnings.push(
      'Redis configuration missing: Provide REDIS_URL or REDIS_HOST. Defaulting to localhost:6379',
    );
  }

  if (hasRedisUrl && hasIndividualRedisConfig) {
    warnings.push(
      'Both REDIS_URL and individual Redis fields are set. REDIS_URL will be used.',
    );
  }

  // JWT validation (critical for auth)
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required for authentication');
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    errors.push('JWT_REFRESH_SECRET is required for refresh tokens');
  }

  // Production-specific validations
  if (process.env.NODE_ENV === 'production') {
    if (
      process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_in_production'
    ) {
      errors.push(
        'Production detected: JWT_SECRET must be changed from default value',
      );
    }

    if (
      process.env.JWT_REFRESH_SECRET ===
      'your_refresh_token_secret_change_in_production'
    ) {
      errors.push(
        'Production detected: JWT_REFRESH_SECRET must be changed from default value',
      );
    }
  }

  // Stripe/Payments validation
  const paymentsEnabled =
    process.env.PAYMENTS_ENABLED === 'true' ||
    (process.env.NODE_ENV !== 'production' &&
      process.env.PAYMENTS_ENABLED !== 'false');

  if (paymentsEnabled) {
    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push(
        'STRIPE_SECRET_KEY is required when payments are enabled. ' +
          'Set PAYMENTS_ENABLED=false to disable payments.',
      );
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      warnings.push(
        'STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification will fail.',
      );
    }
  } else {
    warnings.push(
      'Payments are DISABLED (PAYMENTS_ENABLED=false). ' +
        'Bookings will fail payment processing.',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function logValidationResult(result: ValidationResult): void {
  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    result.warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  if (!result.valid) {
    console.error('❌ Configuration errors:');
    result.errors.forEach((e) => console.error(`   - ${e}`));
    console.error('\nApplication cannot start with invalid configuration.');
    process.exit(1);
  }
}
