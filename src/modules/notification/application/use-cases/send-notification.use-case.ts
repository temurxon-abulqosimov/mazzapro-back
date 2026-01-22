import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories';
import { Notification, NotificationType } from '../../domain/entities/notification.entity';
import { FcmService, PushNotificationPayload } from '../../infrastructure/services';
import { CreateNotificationDto, NotificationTemplates } from '../dto';

// Device token repository interface (from Identity module)
export interface IDeviceTokenRepository {
  findActiveByUserId(userId: string): Promise<{ token: string; platform: string }[]>;
  deactivateTokens(tokens: string[]): Promise<void>;
}

export const DEVICE_TOKEN_REPOSITORY = Symbol('IDeviceTokenRepository');

@Injectable()
export class SendNotificationUseCase {
  private readonly logger = new Logger(SendNotificationUseCase.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: IDeviceTokenRepository,
    private readonly fcmService: FcmService,
  ) {}

  async execute(dto: CreateNotificationDto): Promise<Notification> {
    // Create and save notification
    const notification = Notification.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl,
      data: dto.data,
    });

    const saved = await this.notificationRepository.save(notification);

    // Send push notification if requested
    if (dto.sendPush !== false) {
      await this.sendPushNotification(dto.userId, {
        title: dto.title,
        body: dto.body,
        imageUrl: dto.imageUrl,
        data: {
          notificationId: saved.id,
          type: dto.type,
          ...this.stringifyData(dto.data),
        },
      });

      // Mark push as sent
      saved.markPushSent();
      await this.notificationRepository.save(saved);
    }

    return saved;
  }

  async sendToMultipleUsers(
    userIds: string[],
    notification: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<{ successCount: number; failureCount: number }> {
    const notifications = userIds.map((userId) =>
      Notification.create({
        userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        data: notification.data,
      }),
    );

    await this.notificationRepository.saveMany(notifications);

    // Collect all device tokens
    const tokensByUser = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        tokens: await this.deviceTokenRepository.findActiveByUserId(userId),
      })),
    );

    const allTokens = tokensByUser.flatMap((t) => t.tokens.map((d) => d.token));

    if (allTokens.length === 0) {
      return { successCount: 0, failureCount: userIds.length };
    }

    const result = await this.fcmService.sendToMultipleDevices(allTokens, {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      data: {
        type: notification.type,
        ...this.stringifyData(notification.data),
      },
    });

    // Deactivate invalid tokens
    if (result.invalidTokens.length > 0) {
      await this.deviceTokenRepository.deactivateTokens(result.invalidTokens);
    }

    return {
      successCount: result.successCount,
      failureCount: result.failureCount,
    };
  }

  // Helper to create notification from template
  createFromTemplate(
    type: NotificationType,
    variables: Record<string, string>,
  ): { title: string; body: string } {
    const template = NotificationTemplates[type];
    let title = template.title;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      title = title.replace(`{${key}}`, value);
      body = body.replace(`{${key}}`, value);
    }

    return { title, body };
  }

  private async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<void> {
    try {
      const deviceTokens = await this.deviceTokenRepository.findActiveByUserId(userId);

      if (deviceTokens.length === 0) {
        this.logger.debug(`No active device tokens for user ${userId}`);
        return;
      }

      const tokens = deviceTokens.map((d) => d.token);

      if (tokens.length === 1) {
        const result = await this.fcmService.sendToDevice(tokens[0], payload);
        if (!result.success && result.error === 'INVALID_TOKEN') {
          await this.deviceTokenRepository.deactivateTokens([tokens[0]]);
        }
      } else {
        const result = await this.fcmService.sendToMultipleDevices(tokens, payload);
        if (result.invalidTokens.length > 0) {
          await this.deviceTokenRepository.deactivateTokens(result.invalidTokens);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send push to user ${userId}: ${error.message}`);
    }
  }

  private stringifyData(data?: Record<string, any>): Record<string, string> {
    if (!data) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }
}
