import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryResponseDto } from './category.dto';

export class StoreLocationDto {
  @ApiProperty()
  address: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiProperty()
  lat: number;

  @ApiProperty()
  lng: number;
}

export class StoreResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty({ type: StoreLocationDto })
  location: StoreLocationDto;

  @ApiProperty({ type: [CategoryResponseDto] })
  categories: CategoryResponseDto[];

  @ApiPropertyOptional()
  distance?: number;

  @ApiPropertyOptional()
  availableProducts?: number;

  @ApiPropertyOptional()
  isFavorited?: boolean;
}

export class StoreDetailResponseDto extends StoreResponseDto {
  @ApiProperty()
  totalProductsSold: number;

  @ApiProperty()
  foodSavedKg: number;

  @ApiProperty()
  createdAt: Date;
}
