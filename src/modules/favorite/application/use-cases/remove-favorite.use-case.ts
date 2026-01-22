import { Injectable, Inject } from '@nestjs/common';
import { IFavoriteRepository, FAVORITE_REPOSITORY } from '../../domain/repositories';

@Injectable()
export class RemoveFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepository: IFavoriteRepository,
  ) {}

  async execute(userId: string, storeId: string): Promise<{ success: boolean; wasRemoved: boolean }> {
    const wasRemoved = await this.favoriteRepository.deleteByUserAndStore(userId, storeId);
    return { success: true, wasRemoved };
  }
}
