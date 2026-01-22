import { Store } from '../entities/store.entity';

export interface GeoQueryOptions {
  lat: number;
  lng: number;
  radiusKm: number;
  marketId?: string;
  categoryIds?: string[];
  limit?: number;
  cursor?: string;
}

export interface IStoreRepository {
  findById(id: string): Promise<Store | null>;
  findByIdWithCategories(id: string): Promise<Store | null>;
  findBySellerId(sellerId: string): Promise<Store | null>;
  findByMarketId(marketId: string): Promise<Store[]>;
  findNearby(options: GeoQueryOptions): Promise<Store[]>;
  save(store: Store): Promise<Store>;
  update(id: string, updates: Partial<Store>): Promise<Store>;
}

export const STORE_REPOSITORY = Symbol('IStoreRepository');
