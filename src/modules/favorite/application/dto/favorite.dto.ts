import { IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductResponseDto } from '@modules/catalog/application/dto/product.dto';

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

export class FavoriteProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  price: number;

  @ApiProperty()
  originalPrice: number;

  @ApiProperty()
  discount: number;

  @ApiProperty()
  storeName: string;

  @ApiProperty()
  addedAt: Date;
}

export class FavoriteListResponseDto {
  @ApiProperty({ type: [FavoriteStoreResponseDto] })
  favorites: (FavoriteStoreResponseDto | ProductResponseDto)[];

  @ApiProperty()
  total: number;

  @ApiPropertyOptional()
  nextCursor?: string;
}

export class FavoriteStatusResponseDto {
  @ApiProperty()
  isFavorite: boolean;
}
