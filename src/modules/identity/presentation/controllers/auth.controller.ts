import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '@common/types';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDeviceTokenDto,
  AuthResponseDto,
} from '../../application/dto';
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  RefreshTokensUseCase,
  LogoutUserUseCase,
  RegisterDeviceTokenUseCase,
} from '../../application/use-cases';
import { RefreshResult } from '../../application/use-cases/refresh-tokens.use-case';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly registerDeviceTokenUseCase: RegisterDeviceTokenUseCase,
  ) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    const result = await this.registerUserUseCase.execute(dto);
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        avatarUrl: result.user.avatarUrl,
        role: result.user.role,
        marketId: result.user.marketId,
        createdAt: result.user.createdAt,
      },
      tokens: result.tokens,
    };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.loginUserUseCase.execute(dto);
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        avatarUrl: result.user.avatarUrl,
        role: result.user.role,
        marketId: result.user.marketId,
        createdAt: result.user.createdAt,
      },
      tokens: result.tokens,
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshResult> {
    const result = await this.refreshTokensUseCase.execute(dto.refreshToken);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.logoutUserUseCase.execute(user.id);
    return null;
  }

  @Post('device-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  @ApiResponse({ status: 200, description: 'Device token registered' })
  async registerDeviceToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    const id = await this.registerDeviceTokenUseCase.execute(user.id, dto);
    return { id, registered: true };
  }
}
