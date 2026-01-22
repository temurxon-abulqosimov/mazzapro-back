import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Category, Seller, Store } from './domain/entities';

// Repositories
import {
  CATEGORY_REPOSITORY,
  SELLER_REPOSITORY,
  STORE_REPOSITORY,
} from './domain/repositories';
import {
  TypeOrmCategoryRepository,
  TypeOrmSellerRepository,
  TypeOrmStoreRepository,
} from './infrastructure/repositories';

// Use Cases
import {
  ApplySellerUseCase,
  GetCategoriesUseCase,
  GetSellerDashboardUseCase,
  GetStoreByIdUseCase,
} from './application/use-cases';

// Controllers
import {
  CategoryController,
  SellerController,
  StoreController,
} from './presentation/controllers';

// External modules
import { IdentityModule } from '@modules/identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Seller, Store]),
    forwardRef(() => IdentityModule),
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

    // Use Cases
    ApplySellerUseCase,
    GetCategoriesUseCase,
    GetSellerDashboardUseCase,
    GetStoreByIdUseCase,
  ],
  exports: [CATEGORY_REPOSITORY, SELLER_REPOSITORY, STORE_REPOSITORY],
})
export class StoreModule {}
