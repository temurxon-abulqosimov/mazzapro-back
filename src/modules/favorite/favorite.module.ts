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
} from './application/use-cases';

// Presentation
import { FavoriteController } from './presentation/controllers';

// External modules
import { StoreModule } from '@modules/store/store.module';
import { CatalogModule } from '@modules/catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite]),
    StoreModule,
    CatalogModule,
  ],
  controllers: [FavoriteController],
  providers: [
    // Repositories
    {
      provide: FAVORITE_REPOSITORY,
      useClass: TypeOrmFavoriteRepository,
    },

    // Use Cases
    AddFavoriteUseCase,
    RemoveFavoriteUseCase,
    GetFavoritesUseCase,
  ],
  exports: [GetFavoritesUseCase, FAVORITE_REPOSITORY],
})
export class FavoriteModule {}
