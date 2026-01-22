import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/types';
import {
  DiscoverProductsDto,
  DiscoverStoresDto,
  MapBoundsDto,
  SearchDto,
} from '../../application/dto';
import { DiscoveryService } from '../../application/services';

@ApiTags('Discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('products')
  @Public()
  @ApiOperation({ summary: 'Discover products near a location' })
  @ApiResponse({ status: 200, description: 'List of nearby products' })
  async discoverProducts(
    @Query() dto: DiscoverProductsDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.discoveryService.discoverProducts(dto, user?.id);
    return {
      data: {
        products: result.items,
      },
      meta: {
        pagination: {
          cursor: result.cursor,
          hasMore: result.hasMore,
        },
        filters: {
          appliedRadius: dto.radius || 5,
          resultCount: result.items.length,
        },
      },
    };
  }

  @Get('stores')
  @Public()
  @ApiOperation({ summary: 'Discover stores near a location' })
  @ApiResponse({ status: 200, description: 'List of nearby stores' })
  async discoverStores(
    @Query() dto: DiscoverStoresDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.discoveryService.discoverStores(dto, user?.id);
    return {
      data: {
        stores: result.items,
      },
      meta: {
        pagination: {
          cursor: result.cursor,
          hasMore: result.hasMore,
        },
      },
    };
  }

  @Get('products/map')
  @Public()
  @ApiOperation({ summary: 'Get products for map view with clustering' })
  @ApiResponse({ status: 200, description: 'Map markers' })
  async getMapMarkers(@Query() dto: MapBoundsDto) {
    const markers = await this.discoveryService.getMapMarkers(dto);
    return {
      data: {
        markers,
      },
    };
  }

  @Get('search')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 searches per minute per IP
  @ApiOperation({ summary: 'Search for products and stores by query' })
  @ApiResponse({ status: 200, description: 'Search results with products and stores' })
  async search(@Query() dto: SearchDto) {
    const result = await this.discoveryService.search(dto);
    return {
      data: {
        products: result.products,
        stores: result.stores,
      },
    };
  }
}
