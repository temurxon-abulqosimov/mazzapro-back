import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { StoreDetailResponseDto } from '../../application/dto';
import { GetStoreByIdUseCase } from '../../application/use-cases';

@ApiTags('Stores')
@Controller('stores')
export class StoreController {
  constructor(private readonly getStoreByIdUseCase: GetStoreByIdUseCase) {}

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get store by ID' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ store: StoreDetailResponseDto }> {
    const store = await this.getStoreByIdUseCase.execute(id);
    return {
      store: {
        id: store.id,
        name: store.name,
        description: store.description,
        rating: Number(store.rating),
        reviewCount: store.reviewCount,
        imageUrl: store.imageUrl,
        location: {
          address: store.address,
          city: store.city,
          lat: Number(store.lat),
          lng: Number(store.lng),
        },
        categories: store.categories?.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
        })) || [],
        totalProductsSold: store.totalProductsSold,
        foodSavedKg: Number(store.foodSavedKg),
        createdAt: store.createdAt,
      },
    };
  }
}
