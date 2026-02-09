import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '../../domain/entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'Surprise Bag' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "What's in the bag? Mention any allergens." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'bakery', description: 'Category UUID or slug' })
  @IsString()
  @MinLength(2)
  // Allow slug or UUID
  categoryId: string;

  @ApiProperty({ example: 1200, description: 'Original price in cents' })
  @IsNumber()
  @Min(1)
  originalPrice: number;

  @ApiProperty({ example: 599, description: 'Discounted price in cents' })
  @IsNumber()
  @Min(1)
  discountedPrice: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiProperty({ example: '17:00', description: 'Pickup start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'pickupWindowStart must be in HH:mm format',
  })
  pickupWindowStart: string;

  @ApiProperty({ example: '20:00', description: 'Pickup end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'pickupWindowEnd must be in HH:mm format',
  })
  pickupWindowEnd: string;

  @ApiPropertyOptional({ type: [String], description: 'Media IDs from upload' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  imageIds?: string[];
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  originalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  discountedPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}

export class ProductImageDto {
  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiProperty()
  position: number;
}

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  originalPrice: number;

  @ApiProperty()
  discountedPrice: number;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  quantityAvailable: number;

  @ApiProperty()
  pickupWindow: {
    start: Date;
    end: Date;
    label: string;
    dateLabel: string;
  };

  @ApiProperty({ enum: ProductStatus })
  status: ProductStatus;

  @ApiProperty({ type: [ProductImageDto] })
  images: ProductImageDto[];

  @ApiProperty()
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

  @ApiProperty()
  category: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiPropertyOptional()
  distance?: number;

  @ApiPropertyOptional()
  isFavorited?: boolean;

  @ApiProperty()
  createdAt: Date;
}
