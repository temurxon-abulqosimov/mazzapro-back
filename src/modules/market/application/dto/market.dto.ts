import { ApiProperty } from '@nestjs/swagger';

export class MarketResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  currencySymbol: string;

  @ApiProperty()
  center: {
    lat: number;
    lng: number;
  };

  @ApiProperty()
  defaultRadiusKm: number;
}
