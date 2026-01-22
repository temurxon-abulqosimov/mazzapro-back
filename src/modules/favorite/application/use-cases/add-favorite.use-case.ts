import { Injectable, Inject } from '@nestjs/common';
import { IFavoriteRepository, FAVORITE_REPOSITORY } from '../../domain/repositories';
import { Favorite } from '../../domain/entities/favorite.entity';
import { NotFoundException } from '@common/exceptions/domain.exception';

// Store repository interface (from Store module)
export interface IStoreRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

export const STORE_REPOSITORY = Symbol('IStoreRepository');

@Injectable()
export class AddFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepository: IFavoriteRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {}

  async execute(userId: string, storeId: string): Promise<{ success: boolean; alreadyExists: boolean }> {
    // Verify store exists
    const store = await this.storeRepository.findById(storeId);
    if (!store) {
      throw new NotFoundException(`Store with id ${storeId} not found`);
    }

    // Check if already favorited
    const existing = await this.favoriteRepository.findByUserAndStore(userId, storeId);
    if (existing) {
      return { success: true, alreadyExists: true };
    }

    // Create favorite
    const favorite = Favorite.create(userId, storeId);
    await this.favoriteRepository.save(favorite);

    return { success: true, alreadyExists: false };
  }
}
