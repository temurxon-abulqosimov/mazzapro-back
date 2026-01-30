import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Seller } from '@modules/store/domain/entities/seller.entity';

// Repositories
import { TypeOrmSellerRepository } from '@modules/store/infrastructure/repositories/typeorm-seller.repository';
import { SELLER_REPOSITORY } from '@modules/store/domain/repositories/seller.repository.interface';

// Use Cases
import { ApplyAsSellerUseCase } from './application/use-cases';

// Controllers
import { SellerController } from './presentation/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Seller])],
  controllers: [SellerController],
  providers: [
    {
      provide: SELLER_REPOSITORY,
      useClass: TypeOrmSellerRepository,
    },
    ApplyAsSellerUseCase,
  ],
  exports: [SELLER_REPOSITORY, ApplyAsSellerUseCase],
})
export class SellerModule {}
