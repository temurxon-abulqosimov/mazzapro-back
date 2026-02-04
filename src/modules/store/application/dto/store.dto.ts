import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
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

export class ToggleStoreStatusDto {
  @ApiProperty({ description: 'Store open status' })
  @IsBoolean()
  isOpen: boolean;
}

export class StoreStatusResponseDto {
  @ApiProperty()
  isOpen: boolean;
}
