import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Category, Seller, Store, Follow } from './domain/entities';

// Repositories
import {
  CATEGORY_REPOSITORY,
  SELLER_REPOSITORY,
  STORE_REPOSITORY,
  FOLLOW_REPOSITORY,
} from './domain/repositories';
import {
  TypeOrmCategoryRepository,
  TypeOrmSellerRepository,
  TypeOrmStoreRepository,
  TypeOrmFollowRepository,
} from './infrastructure/repositories';

// Use Cases
import {
  ApplySellerUseCase,
  GetCategoriesUseCase,
  GetSellerDashboardUseCase,
  GetStoreByIdUseCase,
  ToggleStoreStatusUseCase,
  FollowStoreUseCase,
  UnfollowStoreUseCase,
  GetFollowedStoresUseCase,
} from './application/use-cases';
import {
  GetDashboardStatsUseCase,
  GetLiveOrdersUseCase,
} from '@modules/seller/application/use-cases';

// Controllers
import {
  CategoryController,
  SellerController,
  StoreController,
} from './presentation/controllers';

// External modules
import { IdentityModule } from '@modules/identity/identity.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { BookingModule } from '@modules/booking/booking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Seller, Store, Follow]),
    forwardRef(() => IdentityModule),
    forwardRef(() => CatalogModule),
    forwardRef(() => BookingModule),
  ],
  controllers: [CategoryController, SellerController, StoreController],
  providers: [
    // Repositories
    {
      provide: CATEGORY_REPOSITORY,
      useClass: TypeOrmCategoryRepository,
    },
    {
      provide: SELLER_REPOSITORY,
      useClass: TypeOrmSellerRepository,
    },
    {
      provide: STORE_REPOSITORY,
      useClass: TypeOrmStoreRepository,
    },
    {
      provide: FOLLOW_REPOSITORY,
      useClass: TypeOrmFollowRepository,
    },

    // Use Cases
    ApplySellerUseCase,
    GetCategoriesUseCase,
    GetSellerDashboardUseCase,
    GetStoreByIdUseCase,
    GetDashboardStatsUseCase,
    ToggleStoreStatusUseCase,
    GetLiveOrdersUseCase,
    FollowStoreUseCase,
    UnfollowStoreUseCase,
    GetFollowedStoresUseCase,
  ],
  exports: [
    CATEGORY_REPOSITORY,
    SELLER_REPOSITORY,
    STORE_REPOSITORY,
    FOLLOW_REPOSITORY,
    GetFollowedStoresUseCase // Export so UsersController can use it
  ],
})
export class StoreModule { }
