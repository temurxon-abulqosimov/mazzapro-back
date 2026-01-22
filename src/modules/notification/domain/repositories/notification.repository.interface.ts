import { Notification, NotificationCategory } from '../entities/notification.entity';

export interface NotificationQueryOptions {
  category?: NotificationCategory;
  isRead?: boolean;
  limit?: number;
  cursor?: string;
}

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: NotificationQueryOptions): Promise<Notification[]>;
  countUnreadByUserId(userId: string): Promise<number>;
  save(notification: Notification): Promise<Notification>;
  saveMany(notifications: Notification[]): Promise<Notification[]>;
  markAsRead(ids: string[], userId: string): Promise<number>;
  markAllAsRead(userId: string): Promise<number>;
  deleteOlderThan(date: Date): Promise<number>;
}

export const NOTIFICATION_REPOSITORY = Symbol('INotificationRepository');
