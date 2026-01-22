import { IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddFavoriteDto {
  @ApiProperty({ description: 'Store ID to add to favorites' })
  @IsUUID()
  storeId: string;
}

export class RemoveFavoriteDto {
  @ApiProperty({ description: 'Store ID to remove from favorites' })
  @IsUUID()
  storeId: string;
}

export class FavoriteStoreResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  address: string;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;

  @ApiPropertyOptional()
  distance?: number;

  @ApiProperty()
  addedAt: Date;
}

export class FavoriteListResponseDto {
  @ApiProperty({ type: [FavoriteStoreResponseDto] })
  favorites: FavoriteStoreResponseDto[];

  @ApiProperty()
  total: number;

  @ApiPropertyOptional()
  nextCursor?: string;
}

export class FavoriteStatusResponseDto {
  @ApiProperty()
  isFavorite: boolean;
}
