import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination (opaque string from previous response)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 50,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class GeoLocationDto {
  @ApiPropertyOptional({ description: 'Latitude', minimum: -90, maximum: 90 })
  @Type(() => Number)
  lat: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  lng: number;
}
