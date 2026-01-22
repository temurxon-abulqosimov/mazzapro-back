import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../../domain/entities/store.entity';
import {
  IStoreRepository,
  GeoQueryOptions,
} from '../../domain/repositories/store.repository.interface';
import { decodeCursor } from '@common/utils/pagination.util';

@Injectable()
export class TypeOrmStoreRepository implements IStoreRepository {
  constructor(
    @InjectRepository(Store)
    private readonly repository: Repository<Store>,
  ) {}

  async findById(id: string): Promise<Store | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdWithCategories(id: string): Promise<Store | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['categories', 'seller'],
    });
  }

  async findBySellerId(sellerId: string): Promise<Store | null> {
    return this.repository.findOne({
      where: { sellerId },
      relations: ['categories'],
    });
  }

  async findByMarketId(marketId: string): Promise<Store[]> {
    return this.repository.find({
      where: { marketId, isActive: true },
      relations: ['categories'],
    });
  }

  async findNearby(options: GeoQueryOptions): Promise<Store[]> {
    const { lat, lng, radiusKm, marketId, categoryIds, limit = 20, cursor } = options;

    // Using Haversine formula for distance calculation
    // For production, use PostGIS for better performance
    const query = this.repository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.categories', 'category')
      .addSelect(
        `(
          6371 * acos(
            cos(radians(:lat)) * cos(radians(store.lat)) *
            cos(radians(store.lng) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(store.lat))
          )
        )`,
        'distance',
      )
      .where('store.is_active = :isActive', { isActive: true })
      .setParameter('lat', lat)
      .setParameter('lng', lng)
      .having('distance <= :radius', { radius: radiusKm })
      .orderBy('distance', 'ASC')
      .take(limit + 1);

    if (marketId) {
      query.andWhere('store.market_id = :marketId', { marketId });
    }

    if (categoryIds && categoryIds.length > 0) {
      query.andWhere('category.id IN (:...categoryIds)', { categoryIds });
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query.andWhere('store.id > :lastId', { lastId: decoded.lastId });
      }
    }

    const stores = await query.getMany();
    return stores;
  }

  async save(store: Store): Promise<Store> {
    return this.repository.save(store);
  }

  async update(id: string, updates: Partial<Store>): Promise<Store> {
    await this.repository.update(id, updates);
    const store = await this.findById(id);
    if (!store) {
      throw new Error(`Store with id ${id} not found`);
    }
    return store;
  }
}
