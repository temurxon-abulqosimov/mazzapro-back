import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain
import { Favorite } from './domain/entities/favorite.entity';
import { FAVORITE_REPOSITORY } from './domain/repositories';

// Infrastructure
import { TypeOrmFavoriteRepository } from './infrastructure/repositories';

// Application
import {
  AddFavoriteUseCase,
  RemoveFavoriteUseCase,
  GetFavoritesUseCase,
  STORE_REPOSITORY,
  PRODUCT_REPOSITORY,
} from './application/use-cases';

// Presentation
import { FavoriteController } from './presentation/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite])],
  controllers: [FavoriteController],
  providers: [
    // Repositories
    {
      provide: FAVORITE_REPOSITORY,
      useClass: TypeOrmFavoriteRepository,
    },
    // Note: STORE_REPOSITORY should be provided by StoreModule
    // Placeholder for now - will be overridden when importing StoreModule
    {
      provide: STORE_REPOSITORY,
      useValue: {
        findById: async (id: string) => ({ id, name: 'Store' }),
      },
    },
    // Note: PRODUCT_REPOSITORY should be provided by ProductModule
    // Placeholder for now - will be overridden when importing ProductModule
    {
      provide: PRODUCT_REPOSITORY,
      useValue: {
        findById: async (id: string) => ({ id, name: 'Product' }),
      },
    },

    // Use Cases
    AddFavoriteUseCase,
    RemoveFavoriteUseCase,
    GetFavoritesUseCase,
  ],
  exports: [GetFavoritesUseCase, FAVORITE_REPOSITORY],
})
export class FavoriteModule {}
