import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/types';
import {
  UpdateProfileDto,
  UserProfileResponseDto,
} from '../../application/dto';
import {
  GetUserProfileUseCase,
  UpdateUserProfileUseCase,
} from '../../application/use-cases';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
  ) {}

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
