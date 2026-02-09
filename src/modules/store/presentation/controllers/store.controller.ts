import { Controller, Get, Post, Delete, Param, ParseUUIDPipe, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { StoreDetailResponseDto } from '../../application/dto';
import {
  GetStoreByIdUseCase,
  FollowStoreUseCase,
  UnfollowStoreUseCase,
  GetStoreProductsUseCase
} from '../../application/use-cases';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@common/guards/optional-jwt-auth.guard';
import { AuthenticatedRequest } from '@common/types';

@ApiTags('Stores')
@Controller('stores')
export class StoreController {
  constructor(
    private readonly getStoreByIdUseCase: GetStoreByIdUseCase,
    private readonly followStoreUseCase: FollowStoreUseCase,
    private readonly unfollowStoreUseCase: UnfollowStoreUseCase,
    private readonly getStoreProductsUseCase: GetStoreProductsUseCase,
  ) { }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get store by ID' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any, // Using 'any' to access user safely even if not authenticated
  ): Promise<{ store: StoreDetailResponseDto }> {
    const userId = req.user?.id;
    const result = await this.getStoreByIdUseCase.execute(id, userId);
    const { store, isFollowing } = result;

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
        isFollowing,
        createdAt: store.createdAt,
      },
    };
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get all active products for a store' })
  @ApiResponse({ status: 200, description: 'Return all products for the store.' })
  async getStoreProducts(@Param('id') id: string) {
    const products = await this.getStoreProductsUseCase.execute(id);

    return products.map(product => {
      // Create pickup window object expected by frontend
      const start = new Date(product.pickupWindowStart);
      const end = new Date(product.pickupWindowEnd);

      const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const label = `${startTime} - ${endTime}`;

      const today = new Date();
      const isToday = start.getDate() === today.getDate() &&
        start.getMonth() === today.getMonth() &&
        start.getFullYear() === today.getFullYear();

      const dateLabel = isToday ? 'Today' : start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      return {
        ...product,
        pickupWindow: {
          start: product.pickupWindowStart,
          end: product.pickupWindowEnd,
          label,
          dateLabel
        }
      };
    });
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a store' })
  @ApiResponse({ status: 200, description: 'Store followed successfully' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async followStore(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: null }> {
    await this.followStoreUseCase.execute(req.user.id, id);
    return { data: null };
  }

  @Delete(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a store' })
  @ApiResponse({ status: 200, description: 'Store unfollowed successfully' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async unfollowStore(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: null }> {
    await this.unfollowStoreUseCase.execute(req.user.id, id);
    return { data: null };
  }
}
