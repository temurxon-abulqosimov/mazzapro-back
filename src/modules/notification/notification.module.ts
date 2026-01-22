import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Domain
import { Notification } from './domain/entities/notification.entity';
import { NOTIFICATION_REPOSITORY } from './domain/repositories';

// Infrastructure
import { TypeOrmNotificationRepository } from './infrastructure/repositories';
import { FcmService } from './infrastructure/services';

// Application
import {
  GetNotificationsUseCase,
  MarkNotificationsReadUseCase,
  SendNotificationUseCase,
  DEVICE_TOKEN_REPOSITORY,
} from './application/use-cases';

// Presentation
import { NotificationController } from './presentation/controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    ConfigModule,
  ],
  controllers: [NotificationController],
  providers: [
    // Repositories
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: TypeOrmNotificationRepository,
    },
    // Note: DEVICE_TOKEN_REPOSITORY should be provided by IdentityModule
    // For now, we'll create a placeholder that will be overridden
    {
      provide: DEVICE_TOKEN_REPOSITORY,
      useValue: {
        findActiveByUserId: async () => [],
        deactivateTokens: async () => {},
      },
    },

    // Services
    FcmService,

    // Use Cases
    GetNotificationsUseCase,
    MarkNotificationsReadUseCase,
    SendNotificationUseCase,
  ],
  exports: [
    SendNotificationUseCase,
    FcmService,
    NOTIFICATION_REPOSITORY,
  ],
})
export class NotificationModule {}
