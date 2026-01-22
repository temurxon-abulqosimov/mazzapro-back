import { Module } from '@nestjs/common';
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
} from './application/use-cases';

// Controllers
import { AuthController, UsersController } from './presentation/controllers';

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
  ],
  exports: [
    USER_REPOSITORY,
    DEVICE_TOKEN_REPOSITORY,
    JwtTokenService,
    JwtModule,
    PassportModule,
  ],
})
export class IdentityModule {}
