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
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/identity/domain/repositories/user.repository.interface';
import {
  IStoreRepository,
  STORE_REPOSITORY,
} from '@modules/store/domain/repositories/store.repository.interface';
import { QrCodeService } from '../../infrastructure/services/qr-code.service';
import {
  EntityNotFoundException,
  UnauthorizedAccessException,
  DomainException,
} from '@common/exceptions';

const CO2_PER_MEAL_KG = 0.4; // Average CO2 saved per meal rescued

@Injectable()
export class CompleteBookingUseCase {
  private readonly logger = new Logger(CompleteBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    private readonly qrCodeService: QrCodeService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(sellerId: string, storeId: string, qrCodeData: string): Promise<Booking> {
    // Parse QR code
    const parsed = this.qrCodeService.parseQrCodeData(qrCodeData);
    if (!parsed) {
      throw new DomainException('INVALID_QR_CODE', 'Invalid QR code format');
    }

    const booking = await this.bookingRepository.findByIdWithRelations(parsed.bookingId);

    if (!booking) {
      throw new EntityNotFoundException('Booking', parsed.bookingId);
    }

    // Verify store ownership
    if (booking.storeId !== storeId) {
      throw new UnauthorizedAccessException('Booking');
    }

    // Verify booking can be completed
    if (!booking.isActive()) {
      throw new DomainException(
        'BOOKING_CANNOT_COMPLETE',
        `Cannot complete booking with status ${booking.status}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Complete booking
      booking.complete();
      await queryRunner.manager.save(booking);

      // Confirm sale on product (reduce actual quantity)
      const product = await this.productRepository.findById(booking.productId);
      if (product) {
        product.confirmSale(booking.quantity);
        await queryRunner.manager.save(product);
      }

      // Update user stats
      const user = await this.userRepository.findById(booking.userId);
      if (user) {
        const co2Saved = booking.quantity * CO2_PER_MEAL_KG;
        const moneySaved = (booking.product?.originalPrice || 0) - booking.unitPrice;
        user.addMealSaved(booking.quantity, co2Saved, moneySaved * booking.quantity);
        await queryRunner.manager.save(user);
      }

      // Update store stats
      const store = await this.storeRepository.findById(booking.storeId);
      if (store) {
        const foodKg = booking.quantity * 0.3; // Approximate kg per item
        store.recordSale(booking.quantity, booking.totalPrice, foodKg);
        await queryRunner.manager.save(store);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Booking completed: ${booking.orderNumber}`);

      return booking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
