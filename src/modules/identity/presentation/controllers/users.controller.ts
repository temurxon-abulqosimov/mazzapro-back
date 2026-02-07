import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser, AuthenticatedRequest } from '@common/types';
import {
  UpdateProfileDto,
  UserProfileResponseDto,
} from '../../application/dto';
import {
  GetUserProfileUseCase,
  UpdateUserProfileUseCase,
} from '../../application/use-cases';
import { GetFollowedStoresUseCase } from '../../../store/application/use-cases';
import { StoreDetailResponseDto } from '../../../store/application/dto'; // Assuming we reuse this or creating a summary DTO

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly getFollowedStoresUseCase: GetFollowedStoresUseCase,
  ) { }

  @Get('me/followed-stores')
  @ApiOperation({ summary: 'Get followed stores' })
  @ApiResponse({ status: 200, description: 'List of followed stores' })
  async getFollowedStores(@Req() req: AuthenticatedRequest) {
    const stores = await this.getFollowedStoresUseCase.execute(req.user.id);
    return {
      stores: stores.map(store => ({
        id: store.id,
        name: store.name,
        rating: Number(store.rating),
        imageUrl: store.imageUrl,
        location: {
          address: store.address,
          city: store.city,
          lat: Number(store.lat),
          lng: Number(store.lng),
        },
        // Add other fields as necessary for the frontend list
      }))
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ user: UserProfileResponseDto }> {
    const user = await this.getUserProfileUseCase.execute(currentUser.id);
    const level = user.getLevel();

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        level: {
          name: level.name,
          progress: level.progress,
        },
        stats: {
          mealsSaved: user.mealsSaved,
          co2Prevented: Number(user.co2Saved),
          moneySaved: user.moneySaved,
        },
        memberSince: user.createdAt,
        market: {
          id: user.marketId,
          name: 'Market', // TODO: Fetch from Market module
        },
      },
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.updateUserProfileUseCase.execute(
      currentUser.id,
      dto,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }
}
