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
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from '../../application/dto';
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  RefreshTokensUseCase,
  LogoutUserUseCase,
  RegisterDeviceTokenUseCase,
  VerifyEmailUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  VerifyOtpUseCase,
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
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
  ) { }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Phone number already exists' })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    const result = await this.registerUserUseCase.execute(dto);
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
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
  @ApiOperation({ summary: 'Login with phone number and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.loginUserUseCase.execute(dto);
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        phoneNumber: result.user.phoneNumber,
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

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify phone number with code' })
  @ApiResponse({ status: 200, description: 'Phone verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.verifyEmailUseCase.execute(dto.phoneNumber, dto.token);
    return { message: 'Phone number verified successfully' };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset with phone number' })
  @ApiResponse({ status: 200, description: 'If phone exists, reset code sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.forgotPasswordUseCase.execute(dto.phoneNumber);
    return { message: 'If your phone number is registered, you will receive a reset code shortly' };
  }

  @Post('verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    await this.verifyOtpUseCase.execute(dto.phoneNumber, dto.otp);
    return { message: 'OTP verified successfully' };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.resetPasswordUseCase.execute(dto.phoneNumber, dto.otp, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }
}
