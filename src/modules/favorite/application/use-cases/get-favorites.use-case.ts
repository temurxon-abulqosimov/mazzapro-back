import { Injectable, Inject } from '@nestjs/common';
import { IFavoriteRepository, FAVORITE_REPOSITORY } from '../../domain/repositories';
import { FavoriteListResponseDto, FavoriteStoreResponseDto } from '../dto';
import { encodeCursor } from '@common/utils/pagination.util';

@Injectable()
export class GetFavoritesUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepository: IFavoriteRepository,
  ) {}

  async execute(
    userId: string,
    limit = 20,
    cursor?: string,
    userLat?: number,
    userLng?: number,
  ): Promise<FavoriteListResponseDto> {
    const [favorites, total] = await Promise.all([
      this.favoriteRepository.findByUserId(userId, limit, cursor),
      this.favoriteRepository.countByUserId(userId),
    ]);

    const hasMore = favorites.length === limit;
    const nextCursor = hasMore && favorites.length > 0
      ? encodeCursor({ lastId: favorites[favorites.length - 1].id })
      : undefined;

    return {
      favorites: favorites.map((f) => this.mapToResponse(f, userLat, userLng)),
      total,
      nextCursor,
    };
  }

  async checkIsFavorite(userId: string, storeId: string): Promise<boolean> {
    const favorite = await this.favoriteRepository.findByUserAndStore(userId, storeId);
    return !!favorite;
  }

  async getFavoriteStoreIds(userId: string): Promise<string[]> {
    return this.favoriteRepository.getStoreIdsByUserId(userId);
  }

  private mapToResponse(
    favorite: any,
    userLat?: number,
    userLng?: number,
  ): FavoriteStoreResponseDto {
    const store = favorite.store;
    let distance: number | undefined;

    if (userLat && userLng && store?.lat && store?.lng) {
      distance = this.calculateDistance(userLat, userLng, Number(store.lat), Number(store.lng));
    }

    return {
      id: store?.id || favorite.storeId,
      name: store?.name || '',
      imageUrl: store?.imageUrl || null,
      address: store?.address || '',
      rating: Number(store?.rating || 0),
      reviewCount: store?.reviewCount || 0,
      distance,
      addedAt: favorite.createdAt,
    };
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // Round to 2 decimal places
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
