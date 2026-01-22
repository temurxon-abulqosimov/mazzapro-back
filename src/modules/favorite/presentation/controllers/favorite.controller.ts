import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/types';
import {
  FavoriteListResponseDto,
  FavoriteStatusResponseDto,
} from '../../application/dto';
import {
  AddFavoriteUseCase,
  RemoveFavoriteUseCase,
  GetFavoritesUseCase,
} from '../../application/use-cases';

@ApiTags('Favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FavoriteController {
  constructor(
    private readonly addFavoriteUseCase: AddFavoriteUseCase,
    private readonly removeFavoriteUseCase: RemoveFavoriteUseCase,
    private readonly getFavoritesUseCase: GetFavoritesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user favorite stores' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of favorite stores' })
  async getFavorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ): Promise<FavoriteListResponseDto> {
    return this.getFavoritesUseCase.execute(
      user.id,
      limit || 20,
      cursor,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
    );
  }

  @Get('stores/:storeId/status')
  @ApiOperation({ summary: 'Check if store is favorited' })
  @ApiResponse({ status: 200, description: 'Favorite status' })
  async checkFavoriteStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ): Promise<FavoriteStatusResponseDto> {
    const isFavorite = await this.getFavoritesUseCase.checkIsFavorite(user.id, storeId);
    return { isFavorite };
  }

  @Post('stores/:storeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add store to favorites' })
  @ApiResponse({ status: 200, description: 'Store added to favorites' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.addFavoriteUseCase.execute(user.id, storeId);
    return {
      success: true,
      message: result.alreadyExists ? 'Already in favorites' : 'Added to favorites',
    };
  }

  @Delete('stores/:storeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove store from favorites' })
  @ApiResponse({ status: 200, description: 'Store removed from favorites' })
  async removeFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.removeFavoriteUseCase.execute(user.id, storeId);
    return {
      success: true,
      message: result.wasRemoved ? 'Removed from favorites' : 'Was not in favorites',
    };
  }
}
