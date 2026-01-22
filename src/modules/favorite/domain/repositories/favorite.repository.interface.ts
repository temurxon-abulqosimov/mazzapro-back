import { Favorite } from '../entities/favorite.entity';

export interface IFavoriteRepository {
  findById(id: string): Promise<Favorite | null>;
  findByUserAndStore(userId: string, storeId: string): Promise<Favorite | null>;
  findByUserId(userId: string, limit?: number, cursor?: string): Promise<Favorite[]>;
  countByUserId(userId: string): Promise<number>;
  getStoreIdsByUserId(userId: string): Promise<string[]>;
  save(favorite: Favorite): Promise<Favorite>;
  delete(id: string): Promise<void>;
  deleteByUserAndStore(userId: string, storeId: string): Promise<boolean>;
}

export const FAVORITE_REPOSITORY = Symbol('IFavoriteRepository');
