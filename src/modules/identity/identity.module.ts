import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { User, RefreshToken, DeviceToken } from './domain/entities';

// Repositories
import {
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  DEVICE_TOKEN_REPOSITORY,
} from './domain/repositories';
import {
  TypeOrmUserRepository,
  TypeOrmRefreshTokenRepository,
  TypeOrmDeviceTokenRepository,
} from './infrastructure/repositories';

// Services
import { PasswordService, JwtTokenService } from './infrastructure/services';
import { TokenService } from './infrastructure/services/token.service';

// Strategies
import { JwtStrategy } from './infrastructure/strategies';

// Use Cases
import {
  RegisterUserUseCase,
  LoginUserUseCase,
  RefreshTokensUseCase,
  LogoutUserUseCase,
  RegisterDeviceTokenUseCase,
  GetUserProfileUseCase,
  UpdateUserProfileUseCase,
  VerifyEmailUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  VerifyOtpUseCase,
} from './application/use-cases';

// Controllers
import { AuthController, UsersController } from './presentation/controllers';
import { StoreModule } from '../store/store.module';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, DeviceToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtAccessExpiration'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => StoreModule),
    NotificationModule,
  ],
  controllers: [AuthController, UsersController],
  providers: [
    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: TypeOrmRefreshTokenRepository,
    },
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useClass: TypeOrmDeviceTokenRepository,
    },

    // Services
    PasswordService,
    JwtTokenService,
    TokenService,

    // Strategies
    JwtStrategy,

    // Use Cases
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokensUseCase,
    LogoutUserUseCase,
    RegisterDeviceTokenUseCase,
    GetUserProfileUseCase,
    UpdateUserProfileUseCase,
    VerifyEmailUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    VerifyOtpUseCase,
  ],
  exports: [
    USER_REPOSITORY,
    DEVICE_TOKEN_REPOSITORY,
    JwtTokenService,
    JwtModule,
    PassportModule,
    TokenService,
  ],
})
export class IdentityModule { }
