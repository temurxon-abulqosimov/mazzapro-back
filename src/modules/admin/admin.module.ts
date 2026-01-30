import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { User } from '@modules/identity/domain/entities/user.entity';
import { Seller } from '@modules/store/domain/entities/seller.entity';
import { Product } from '@modules/catalog/domain/entities/product.entity';

// Application
import {
  GetPendingSellersUseCase,
  ProcessSellerApplicationUseCase,
  GetAdminStatsUseCase,
  SELLER_REPOSITORY,
  SEND_NOTIFICATION_USE_CASE,
} from './application/use-cases';

// Infrastructure
import { TypeOrmSellerRepository } from '@modules/store/infrastructure/repositories/typeorm-seller.repository';

// Presentation
import { AdminController } from './presentation/controllers';
import { AdminSeedController } from './presentation/controllers/admin-seed.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Seller, Product])],
  controllers: [AdminController, AdminSeedController],
  providers: [
    // Real repository implementation
    {
      provide: SELLER_REPOSITORY,
      useClass: TypeOrmSellerRepository,
    },
    {
      provide: SEND_NOTIFICATION_USE_CASE,
      useValue: {
        execute: async () => ({}),
      },
    },

    // Use Cases
    GetPendingSellersUseCase,
    ProcessSellerApplicationUseCase,
    GetAdminStatsUseCase,
  ],
  exports: [],
})
export class AdminModule {}
