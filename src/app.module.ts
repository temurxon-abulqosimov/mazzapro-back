import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

// Config
import { databaseConfig } from '@config/database.config';
import { redisConfig } from '@config/redis.config';
import { authConfig } from '@config/auth.config';
import { storageConfig } from '@config/storage.config';
import { stripeConfig } from '@config/stripe.config';
import { firebaseConfig } from '@config/firebase.config';

// Modules
import { IdentityModule } from '@modules/identity/identity.module';
import { MarketModule } from '@modules/market/market.module';
import { StoreModule } from '@modules/store/store.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { DiscoveryModule } from '@modules/discovery/discovery.module';
import { BookingModule } from '@modules/booking/booking.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { FavoriteModule } from '@modules/favorite/favorite.module';
import { MediaModule } from '@modules/media/media.module';
import { AdminModule } from '@modules/admin/admin.module';
import { RedisModule } from '@common/redis/redis.module';
import { HealthModule } from '@common/health';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        redisConfig,
        authConfig,
        storageConfig,
        stripeConfig,
        firebaseConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const sslEnabled = configService.get<boolean>('database.ssl');

        return {
          type: 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.database'),

          // SSL Configuration (Railway requires this)
          ssl: sslEnabled
            ? { rejectUnauthorized: false }
            : false,

          // Entity Management
          autoLoadEntities: true,
          synchronize: false, // NEVER use synchronize in production

          // Connection retry (don't block app startup)
          retryAttempts: 10,
          retryDelay: 3000, // 3 seconds between retries

          // Connection Pooling
          extra: {
            max: configService.get<number>('database.poolSize', 10),
            min: 2,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
          },

          // Logging (safe - no credentials)
          logging: configService.get<boolean>('database.logging', false)
            ? ['error', 'warn', 'migration']
            : false,
        };
      },
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // Redis
    RedisModule,

    // Health Check
    HealthModule,

    // Common infrastructure services (global)
    CommonModule,

    // Feature Modules
    IdentityModule,
    MarketModule,
    StoreModule,
    CatalogModule,
    DiscoveryModule,
    BookingModule,
    NotificationModule,
    FavoriteModule,
    MediaModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
