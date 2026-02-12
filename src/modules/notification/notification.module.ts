import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Domain
import { Notification } from './domain/entities/notification.entity';
import { NotificationPreference } from './domain/entities/notification-preference.entity';
import { NOTIFICATION_REPOSITORY } from './domain/repositories';

// Infrastructure
import { TypeOrmNotificationRepository } from './infrastructure/repositories';
import { FcmService } from './infrastructure/services';
import { ExpoPushService } from './infrastructure/services/expo-push.service';
import { SmsService } from './infrastructure/services/sms.service';
import { ProductCreatedListener } from './infrastructure/listeners/product-created.listener';

// Application
import {
  GetNotificationsUseCase,
  MarkNotificationsReadUseCase,
  SendNotificationUseCase,
} from './application/use-cases';

// Presentation
import { NotificationController } from './presentation/controllers';
import { StoreModule } from '../store/store.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),
    ConfigModule,
    forwardRef(() => StoreModule),
    forwardRef(() => IdentityModule),
  ],
  controllers: [NotificationController],
  providers: [
    // Repositories
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: TypeOrmNotificationRepository,
    },

    // Services
    FcmService,
    ExpoPushService,
    SmsService,
    ProductCreatedListener,

    // Use Cases
    GetNotificationsUseCase,
    MarkNotificationsReadUseCase,
    SendNotificationUseCase,
  ],
  exports: [
    SendNotificationUseCase,
    FcmService,
    ExpoPushService,
    SmsService,
    NOTIFICATION_REPOSITORY,
  ],
})
export class NotificationModule { }
