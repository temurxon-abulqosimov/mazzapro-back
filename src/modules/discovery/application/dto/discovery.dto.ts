import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@common/dto/pagination.dto';

export enum SortOption {
  RECOMMENDED = 'recommended',
  DISTANCE = 'distance',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export class DiscoverProductsDto extends PaginationDto {
  @ApiProperty({ description: 'Latitude', minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude', minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ description: 'Search radius in km', default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radius?: number = 5;

  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Category slugs (comma-separated)' })
  @IsOptional()
  @IsString()
  categories?: string;

  @ApiPropertyOptional({ description: 'Store ID to filter products' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Minimum price in cents' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price in cents' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: SortOption, default: SortOption.RECOMMENDED })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption = SortOption.RECOMMENDED;
}

export class DiscoverStoresDto extends PaginationDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radius?: number = 5;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Only show stores with available products' })
  @IsOptional()
  @Type(() => Boolean)
  hasAvailability?: boolean;
}

export class MapBoundsDto {
  @ApiProperty({ description: 'Bounds: sw_lat,sw_lng,ne_lat,ne_lng' })
  @IsString()
  bounds: string;

  @ApiProperty({ description: 'Map zoom level' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  zoom: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class DiscoveryProductResponseDto {
  id: string;
  name: string;
  description: string | null;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  quantity: number;
  quantityAvailable: number;
  pickupWindow: {
    start: Date;
    end: Date;
    label: string;
  };
  status: string;
  images: { url: string; position: number }[];
  store: {
    id: string;
    name: string;
    rating: number;
    imageUrl: string | null;
    location: {
      address: string;
      lat: number;
      lng: number;
    };
  };
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  };
  distance: number;
  createdAt: Date;
  isFavorited?: boolean;
}

export class MapMarkerDto {
  type: 'product' | 'cluster';
  id?: string;
  lat: number;
  lng: number;
  price?: number;
  name?: string;
  imageUrl?: string;
  count?: number;
  minPrice?: number;
  storeId?: string;
  bounds?: string;
}

export class SearchDto extends PaginationDto {
  @ApiProperty({ description: 'Search query string' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: 'Latitude for location-based search', minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude for location-based search', minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ description: 'Search radius in km', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radius?: number = 10;
}
