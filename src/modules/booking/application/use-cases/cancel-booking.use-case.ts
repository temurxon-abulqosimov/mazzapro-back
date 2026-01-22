import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Booking } from '../../domain/entities/booking.entity';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../domain/repositories/booking.repository.interface';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '@modules/catalog/domain/repositories/product.repository.interface';
import { PaymentService } from '../../infrastructure/services/payment.service';
import {
  EntityNotFoundException,
  UnauthorizedAccessException,
  DomainException,
} from '@common/exceptions';

@Injectable()
export class CancelBookingUseCase {
  private readonly logger = new Logger(CancelBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly paymentService: PaymentService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(bookingId: string, userId: string, reason?: string): Promise<Booking> {
    const booking = await this.bookingRepository.findByIdWithRelations(bookingId);

    if (!booking) {
      throw new EntityNotFoundException('Booking', bookingId);
    }

    if (booking.userId !== userId) {
      throw new UnauthorizedAccessException('Booking');
    }

    if (!booking.canCancel()) {
      throw new DomainException(
        'BOOKING_CANNOT_CANCEL',
        `Cannot cancel booking with status ${booking.status}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Release stock
      const product = await this.productRepository.findById(booking.productId);
      if (product) {
        product.releaseStock(booking.quantity);
        await queryRunner.manager.save(product);
      }

      // Process refund if payment was captured
      if (booking.payment && booking.payment.isCaptured()) {
        const refundResult = await this.paymentService.refundPayment(
          booking.payment.providerTxId!,
          booking.payment.amount,
        );

        if (refundResult.success) {
          booking.payment.refund(refundResult.refundId!);
        } else {
          this.logger.error(`Refund failed for booking ${bookingId}: ${refundResult.error}`);
          // Continue with cancellation even if refund fails
          // Manual intervention required
        }
      }

      // Cancel booking
      booking.cancel(reason);
      await queryRunner.manager.save(booking);

      await queryRunner.commitTransaction();

      this.logger.log(`Booking cancelled: ${booking.orderNumber}`);

      return booking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
