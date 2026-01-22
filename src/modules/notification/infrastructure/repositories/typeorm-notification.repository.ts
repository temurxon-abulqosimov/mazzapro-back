import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationCategory,
} from '../../domain/entities/notification.entity';
import {
  INotificationRepository,
  NotificationQueryOptions,
} from '../../domain/repositories/notification.repository.interface';
import { decodeCursor } from '@common/utils/pagination.util';

@Injectable()
export class TypeOrmNotificationRepository implements INotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  async findById(id: string): Promise<Notification | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(
    userId: string,
    options?: NotificationQueryOptions,
  ): Promise<Notification[]> {
    const query = this.repository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');

    if (options?.category) {
      const typesByCategory = this.getTypesByCategory(options.category);
      query.andWhere('notification.type IN (:...types)', { types: typesByCategory });
    }

    if (options?.isRead !== undefined) {
      query.andWhere('notification.is_read = :isRead', { isRead: options.isRead });
    }

    if (options?.cursor) {
      const decoded = decodeCursor(options.cursor);
      if (decoded) {
        query.andWhere('notification.created_at < :lastDate', {
          lastDate: new Date(decoded.lastValue as number),
        });
      }
    }

    if (options?.limit) {
      query.take(options.limit + 1);
    }

    return query.getMany();
  }

  async countUnreadByUserId(userId: string): Promise<number> {
    return this.repository.count({
      where: { userId, isRead: false },
    });
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repository.save(notification);
  }

  async saveMany(notifications: Notification[]): Promise<Notification[]> {
    return this.repository.save(notifications);
  }

  async markAsRead(ids: string[], userId: string): Promise<number> {
    const result = await this.repository.update(
      { id: In(ids), userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return result.affected || 0;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return result.affected || 0;
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.repository.delete({
      createdAt: LessThan(date),
    });
    return result.affected || 0;
  }

  private getTypesByCategory(category: NotificationCategory): NotificationType[] {
    switch (category) {
      case NotificationCategory.ORDERS:
        return [
          NotificationType.ORDER_CONFIRMED,
          NotificationType.PICKUP_READY,
          NotificationType.PICKUP_REMINDER,
          NotificationType.ORDER_COMPLETED,
          NotificationType.ORDER_CANCELLED,
          NotificationType.ORDER_EXPIRED,
        ];
      case NotificationCategory.OFFERS:
        return [
          NotificationType.PRICE_DROP,
          NotificationType.NEW_OFFER,
          NotificationType.PROMO,
          NotificationType.REFERRAL,
        ];
      case NotificationCategory.SYSTEM:
        return [
          NotificationType.SELLER_APPROVED,
          NotificationType.SELLER_REJECTED,
          NotificationType.SYSTEM,
        ];
      default:
        return Object.values(NotificationType);
    }
  }
}
