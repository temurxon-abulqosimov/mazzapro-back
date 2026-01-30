import { IsString, IsNotEmpty, MinLength, MaxLength, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SellerApplicationDto {
  @ApiProperty({
    description: 'Business name',
    example: 'Green Market Grocery',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  businessName: string;

  @ApiProperty({
    description: 'Short description of the business',
    example: 'Fresh organic produce and local goods',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Business address',
    example: '123 Main Street, Building A',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'Latitude',
    example: 40.7128,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    description: 'Longitude',
    example: -74.0060,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({
    description: 'Business phone number (optional)',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;
}
