import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Market } from './domain/entities';

// Repositories
import { MARKET_REPOSITORY } from './domain/repositories';
import { TypeOrmMarketRepository } from './infrastructure/repositories';

// Use Cases
import {
  GetMarketsUseCase,
  GetMarketByIdUseCase,
} from './application/use-cases';

// Controllers
import { MarketController } from './presentation/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Market])],
  controllers: [MarketController],
  providers: [
    // Repositories
    {
      provide: MARKET_REPOSITORY,
      useClass: TypeOrmMarketRepository,
    },

    // Use Cases
    GetMarketsUseCase,
    GetMarketByIdUseCase,
  ],
  exports: [MARKET_REPOSITORY],
})
export class MarketModule {}
