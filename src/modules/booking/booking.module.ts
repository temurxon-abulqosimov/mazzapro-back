import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Booking, Payment } from './domain/entities';

// Repositories
import { BOOKING_REPOSITORY } from './domain/repositories';
import { TypeOrmBookingRepository } from './infrastructure/repositories';

// Services
import { PaymentService, QrCodeService } from './infrastructure/services';

// Schedulers
import { BookingExpirationScheduler } from './infrastructure/schedulers';

// Use Cases
import {
  CreateBookingUseCase,
  GetUserBookingsUseCase,
  GetBookingByIdUseCase,
  CancelBookingUseCase,
  CompleteBookingUseCase,
} from './application/use-cases';

// Controllers
import {
  BookingController,
  SellerOrderController,
} from './presentation/controllers';

// External modules
import { CatalogModule } from '@modules/catalog/catalog.module';
import { IdentityModule } from '@modules/identity/identity.module';
import { StoreModule } from '@modules/store/store.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { RedisModule } from '@common/redis/redis.module';
import { Product } from '@modules/catalog/domain/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment, Product]),
    forwardRef(() => CatalogModule),
    forwardRef(() => IdentityModule),
    forwardRef(() => StoreModule),
    forwardRef(() => NotificationModule),
    RedisModule,
  ],
  controllers: [BookingController, SellerOrderController],
  providers: [
    // Repositories
    {
      provide: BOOKING_REPOSITORY,
      useClass: TypeOrmBookingRepository,
    },

    // Services
    PaymentService,
    QrCodeService,

    // Use Cases
    CreateBookingUseCase,
    GetUserBookingsUseCase,
    GetBookingByIdUseCase,
    CancelBookingUseCase,
    CompleteBookingUseCase,

    // Schedulers
    BookingExpirationScheduler,
  ],
  exports: [BOOKING_REPOSITORY],
})
export class BookingModule {}
