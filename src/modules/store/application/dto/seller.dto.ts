import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsPhoneNumber,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerStatus } from '../../domain/entities/seller.entity';

export class ApplySellerDto {
  @ApiProperty({ example: 'Crust & Crumb Bakery' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName: string;

  @ApiProperty({ example: '123 Baker Street' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @ApiProperty({ example: 'San Francisco' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 37.7749 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -122.4194 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ example: '+1-555-123-4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Family-owned bakery...' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;
}

export class SellerApplicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SellerStatus })
  status: SellerStatus;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  submittedAt: Date;
}

export class SellerDashboardResponseDto {
  @ApiProperty()
  store: {
    id: string;
    name: string;
    imageUrl: string | null;
    categories: {
      id: string;
      name: string;
      slug: string;
      icon: string | null;
    }[];
  };

  @ApiProperty()
  stats: {
    period: string;
    posted: number;
    postedChange: number;
    sold: number;
    revenue: number;
    foodSaved: number;
  };
}
