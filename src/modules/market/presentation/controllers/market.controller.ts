import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { MarketResponseDto } from '../../application/dto';
import {
  GetMarketsUseCase,
  GetMarketByIdUseCase,
} from '../../application/use-cases';

@ApiTags('Markets')
@Controller('markets')
export class MarketController {
  constructor(
    private readonly getMarketsUseCase: GetMarketsUseCase,
    private readonly getMarketByIdUseCase: GetMarketByIdUseCase,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all active markets' })
  @ApiResponse({ status: 200, description: 'List of markets' })
  async getMarkets(): Promise<{ markets: MarketResponseDto[] }> {
    const markets = await this.getMarketsUseCase.execute();
    return {
      markets: markets.map((market) => ({
        id: market.id,
        name: market.name,
        slug: market.slug,
        timezone: market.timezone,
        currency: market.currency,
        currencySymbol: market.currencySymbol,
        center: {
          lat: Number(market.centerLat),
          lng: Number(market.centerLng),
        },
        defaultRadiusKm: Number(market.defaultRadiusKm),
      })),
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get market by ID' })
  @ApiResponse({ status: 200, description: 'Market details' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ market: MarketResponseDto }> {
    const market = await this.getMarketByIdUseCase.execute(id);
    return {
      market: {
        id: market.id,
        name: market.name,
        slug: market.slug,
        timezone: market.timezone,
        currency: market.currency,
        currencySymbol: market.currencySymbol,
        center: {
          lat: Number(market.centerLat),
          lng: Number(market.centerLng),
        },
        defaultRadiusKm: Number(market.defaultRadiusKm),
      },
    };
  }
}
