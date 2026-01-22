import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Product } from '@modules/catalog/domain/entities/product.entity';
import { Store } from '@modules/store/domain/entities/store.entity';
import { Category } from '@modules/store/domain/entities/category.entity';

// Services
import { DiscoveryService } from './application/services';

// Controllers
import { DiscoveryController } from './presentation/controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Store, Category])],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
