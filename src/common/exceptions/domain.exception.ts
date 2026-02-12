export class DomainException extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} with id ${id} not found`);
    this.name = 'EntityNotFoundException';
  }
}

export class InvalidStateTransitionException extends DomainException {
  constructor(entity: string, from: string, to: string) {
    super(
      'INVALID_STATE_TRANSITION',
      `Cannot transition ${entity} from ${from} to ${to}`,
    );
    this.name = 'InvalidStateTransitionException';
  }
}

export class InsufficientStockException extends DomainException {
  constructor(productId: string, requested: number, available: number) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for product ${productId}. Requested: ${requested}, Available: ${available}`,
    );
    this.name = 'InsufficientStockException';
  }
}

export class ProductExpiredException extends DomainException {
  constructor(productId: string) {
    super('PRODUCT_EXPIRED', `Product ${productId} pickup window has expired`);
    this.name = 'ProductExpiredException';
  }
}

export class UnauthorizedAccessException extends DomainException {
  constructor(resource: string) {
    super('UNAUTHORIZED_ACCESS', `Unauthorized access to ${resource}`);
    this.name = 'UnauthorizedAccessException';
  }
}

export class PaymentFailedException extends DomainException {
  constructor(reason: string) {
    super('PAYMENT_FAILED', `Payment failed: ${reason}`);
    this.name = 'PaymentFailedException';
  }
}

export class DuplicateBookingException extends DomainException {
  constructor(idempotencyKey: string) {
    super(
      'DUPLICATE_BOOKING',
      `Booking with idempotency key ${idempotencyKey} already exists`,
    );
    this.name = 'DuplicateBookingException';
  }
}

export class InvalidPickupWindowException extends DomainException {
  constructor(message: string) {
    super('INVALID_PICKUP_WINDOW', message);
    this.name = 'InvalidPickupWindowException';
  }
}

export class SellerApplicationPendingException extends DomainException {
  constructor() {
    super(
      'SELLER_APPLICATION_PENDING',
      'Your seller application is still pending review',
    );
    this.name = 'SellerApplicationPendingException';
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid phone number or password');
    this.name = 'InvalidCredentialsException';
  }
}

export class EmailAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super('EMAIL_ALREADY_EXISTS', `Email ${email} is already registered`);
    this.name = 'EmailAlreadyExistsException';
  }
}

export class PhoneAlreadyExistsException extends DomainException {
  constructor(phoneNumber: string) {
    super('PHONE_ALREADY_EXISTS', `Phone number ${phoneNumber} is already registered`);
    this.name = 'PhoneAlreadyExistsException';
  }
}

export class InvalidTokenException extends DomainException {
  constructor() {
    super('INVALID_TOKEN', 'Invalid or expired token');
    this.name = 'InvalidTokenException';
  }
}

export class NotFoundException extends DomainException {
  constructor(message: string) {
    super('NOT_FOUND', message);
    this.name = 'NotFoundException';
  }
}

export class ValidationException extends DomainException {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationException';
  }
}
