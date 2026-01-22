import { Injectable, Inject } from '@nestjs/common';
import {
  INotificationRepository,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories';

@Injectable()
export class MarkNotificationsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(
    userId: string,
    notificationIds: string[],
  ): Promise<{ markedCount: number }> {
    const markedCount = await this.notificationRepository.markAsRead(
      notificationIds,
      userId,
    );

    return { markedCount };
  }

  async executeMarkAll(userId: string): Promise<{ markedCount: number }> {
    const markedCount = await this.notificationRepository.markAllAsRead(userId);
    return { markedCount };
  }
}
