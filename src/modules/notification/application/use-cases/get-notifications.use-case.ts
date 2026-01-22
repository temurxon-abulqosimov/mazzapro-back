import { Injectable, Inject } from '@nestjs/common';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
  NotificationQueryOptions,
} from '../../domain/repositories';
import { Notification } from '../../domain/entities/notification.entity';
import { GetNotificationsDto, NotificationListResponseDto } from '../dto';
import { encodeCursor } from '@common/utils/pagination.util';

@Injectable()
export class GetNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(
    userId: string,
    dto: GetNotificationsDto,
  ): Promise<NotificationListResponseDto> {
    const options: NotificationQueryOptions = {
      category: dto.category,
      isRead: dto.isRead,
      limit: dto.limit || 20,
      cursor: dto.cursor,
    };

    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepository.findByUserId(userId, options),
      this.notificationRepository.countUnreadByUserId(userId),
    ]);

    const hasMore = notifications.length === options.limit;
    const nextCursor = hasMore && notifications.length > 0
      ? encodeCursor({ lastId: notifications[notifications.length - 1].id })
      : undefined;

    return {
      notifications: notifications.map(this.mapToResponse),
      unreadCount,
      nextCursor,
    };
  }

  private mapToResponse(notification: Notification) {
    return {
      id: notification.id,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
