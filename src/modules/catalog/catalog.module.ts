import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Product, ProductImage } from './domain/entities';

// Repositories
import { PRODUCT_REPOSITORY } from './domain/repositories';
import { TypeOrmProductRepository } from './infrastructure/repositories';

// Use Cases
import {
  CreateProductUseCase,
  GetProductByIdUseCase,
  GetSellerProductsUseCase,
  DeactivateProductUseCase,
} from './application/use-cases';

// Controllers
import {
  ProductController,
  SellerProductController,
} from './presentation/controllers';

// External modules
import { StoreModule } from '@modules/store/store.module';
import { RedisModule } from '@common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage]),
    forwardRef(() => StoreModule),
    RedisModule,
  ],
  controllers: [ProductController, SellerProductController],
  providers: [
    // Repositories
    {
      provide: PRODUCT_REPOSITORY,
      useClass: TypeOrmProductRepository,
    },

    // Use Cases
    CreateProductUseCase,
    GetProductByIdUseCase,
    GetSellerProductsUseCase,
    DeactivateProductUseCase,
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class CatalogModule {}
