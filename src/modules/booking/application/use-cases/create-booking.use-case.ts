import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../../domain/entities/booking.entity';
import { Product } from '../../../catalog/domain/entities/product.entity';
import { Payment, PaymentStatus } from '../../domain/entities/payment.entity';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '@modules/catalog/domain/repositories/product.repository.interface';
import {
  IPaymentService,
  PAYMENT_SERVICE,
} from '../../infrastructure/services/payment.interface';
import { QrCodeService } from '../../infrastructure/services/qr-code.service';
import { CreateBookingDto } from '../dto/booking.dto';
import {
  EntityNotFoundException,
  ProductExpiredException,
  InsufficientStockException,
  PaymentFailedException,
  DuplicateBookingException,
} from '@common/exceptions';

@Injectable()
export class CreateBookingUseCase {
  private readonly logger = new Logger(CreateBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(PAYMENT_SERVICE)
    private readonly paymentService: IPaymentService,
    private readonly qrCodeService: QrCodeService,
    private readonly dataSource: DataSource,
  ) { }

  async execute(
    userId: string,
    dto: CreateBookingDto,
    idempotencyKey: string,
  ): Promise<Booking> {
    // Check for duplicate booking (idempotency)
    const existingBooking = await this.bookingRepository.findByIdempotencyKey(idempotencyKey);
    if (existingBooking) {
      if (existingBooking.status !== BookingStatus.FAILED) {
        return existingBooking;
      }
      throw new DuplicateBookingException(idempotencyKey);
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get product with lock (without relations to avoid FOR UPDATE on outer join)
      const product = await queryRunner.manager.findOne(
        Product,
        {
          where: { id: dto.productId },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (!product) {
        throw new EntityNotFoundException('Product', dto.productId);
      }

      // Validate product availability
      if (product.isExpired) {
        throw new ProductExpiredException(dto.productId);
      }

      if (dto.quantity > product.quantityAvailable) {
        throw new InsufficientStockException(
          dto.productId,
          dto.quantity,
          product.quantityAvailable,
        );
      }

      // Reserve stock
      product.reserve(dto.quantity);
      await queryRunner.manager.save(product);

      // Generate order number with retry logic for duplicates using savepoints
      let orderNumber: string = '';
      let savedBooking: Booking | undefined;
      let booking: Booking | undefined;
      let payment: Payment | undefined;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Create a savepoint before attempting to save
          const savepointName = `booking_save_attempt_${retryCount}`;
          await queryRunner.query(`SAVEPOINT ${savepointName}`);

          // Generate order number with random suffix on retries to avoid duplicates
          if (retryCount === 0) {
            orderNumber = await this.bookingRepository.generateOrderNumber();
          } else {
            // Add random suffix on retry to ensure uniqueness (Redis may be returning duplicates)
            const baseNumber = await this.bookingRepository.generateOrderNumber();
            const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
            orderNumber = `${baseNumber}-${randomSuffix}`;
            this.logger.log(`Generated order number with random suffix on retry ${retryCount}: ${orderNumber}`);
          }

          // Create booking
          booking = new Booking();
          booking.orderNumber = orderNumber;
          booking.userId = userId;
          booking.productId = dto.productId;
          booking.storeId = product.storeId;
          booking.quantity = dto.quantity;
          booking.unitPrice = product.discountedPrice;
          booking.totalPrice = product.discountedPrice * dto.quantity;
          booking.status = BookingStatus.PENDING;
          booking.pickupWindowStart = product.pickupWindowStart;
          booking.pickupWindowEnd = product.pickupWindowEnd;
          booking.idempotencyKey = idempotencyKey;

          // Generate QR code data
          booking.qrCodeData = this.qrCodeService.generateQrCodeData(
            orderNumber,
            booking.id || 'pending',
          );

          // Create payment record
          payment = new Payment();
          payment.amount = booking.totalPrice;
          payment.currency = 'USD';
          payment.status = PaymentStatus.PENDING;
          payment.idempotencyKey = `${idempotencyKey}_payment`;
          payment.providerPaymentMethodId = dto.paymentMethodId;

          booking.payment = payment;

          // Save booking (pending) - this may fail with duplicate order number
          savedBooking = await queryRunner.manager.save(booking);

          // Release the savepoint on success
          await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);
          break; // Success, exit retry loop
        } catch (error) {
          // Check if it's a duplicate order number error
          if (error?.code === '23505' && error?.constraint === 'UQ_bookings_order_number') {
            retryCount++;
            this.logger.warn(`Duplicate order number ${orderNumber}, retrying (${retryCount}/${maxRetries})`);

            // Rollback to savepoint to recover from the error
            const savepointName = `booking_save_attempt_${retryCount - 1}`;
            await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);

            if (retryCount >= maxRetries) {
              throw new Error(`Failed to generate unique order number after ${maxRetries} attempts`);
            }
            // Wait a bit before retrying to avoid race conditions
            await new Promise(resolve => setTimeout(resolve, 50 * retryCount));
            continue;
          }
          // If it's not a duplicate error, rethrow
          throw error;
        }
      }

      // Ensure booking was saved successfully
      if (!savedBooking || !booking || !payment) {
        throw new Error('Failed to create booking');
      }

      // Update QR code data with actual ID
      savedBooking.qrCodeData = this.qrCodeService.generateQrCodeData(
        orderNumber,
        savedBooking.id,
      );

      // Capture payment
      const paymentResult = await this.paymentService.capturePayment(
        booking.totalPrice,
        'USD',
        dto.paymentMethodId,
        payment.idempotencyKey,
        {
          bookingId: savedBooking.id,
          orderNumber,
          userId,
        },
      );

      if (!paymentResult.success) {
        // Payment failed - release stock
        product.releaseStock(dto.quantity);
        await queryRunner.manager.save(product);

        savedBooking.markFailed();
        payment.fail(paymentResult.error || 'Payment failed');
        await queryRunner.manager.save(savedBooking);

        await queryRunner.commitTransaction();

        throw new PaymentFailedException(paymentResult.error || 'Payment declined');
      }

      // Payment succeeded
      payment.capture(
        paymentResult.transactionId!,
        paymentResult.last4,
        paymentResult.cardBrand,
      );
      savedBooking.confirm();

      // Generate QR code image
      savedBooking.qrCode = await this.qrCodeService.generateQrCode(
        savedBooking.qrCodeData,
      );

      await queryRunner.manager.save(savedBooking);

      await queryRunner.commitTransaction();

      this.logger.log({
        message: 'Booking created successfully',
        bookingId: savedBooking.id,
        orderNumber: savedBooking.orderNumber,
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
        totalPrice: savedBooking.totalPrice,
        status: savedBooking.status,
      });

      // TODO: Emit domain event for notifications
      // this.eventEmitter.emit('booking.created', savedBooking);

      return savedBooking;
    } catch (error) {
      // Only rollback if transaction is still active
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      this.logger.error({
        message: 'Booking creation failed',
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
        idempotencyKey,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name,
      });

      throw error;
    } finally {
      // Only release if still connected
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }
}
