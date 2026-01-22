import { IsOptional, IsEnum, IsArray, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { NotificationType, NotificationCategory } from '../../domain/entities/notification.entity';

export class GetNotificationsDto {
  @ApiPropertyOptional({ enum: NotificationCategory })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isRead?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;
}

export class MarkNotificationsReadDto {
  @ApiProperty({ type: [String], description: 'Notification IDs to mark as read' })
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds: string[];
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: NotificationCategory })
  category: NotificationCategory;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  notifications: NotificationResponseDto[];

  @ApiProperty()
  unreadCount: number;

  @ApiPropertyOptional()
  nextCursor?: string;
}

// Internal DTO for creating notifications
export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
  sendPush?: boolean;
}

// Notification templates for different types
export const NotificationTemplates: Record<NotificationType, { title: string; body: string }> = {
  [NotificationType.ORDER_CONFIRMED]: {
    title: 'Order Confirmed!',
    body: 'Your order #{orderNumber} has been confirmed. Pick up at {storeName}.',
  },
  [NotificationType.PICKUP_READY]: {
    title: 'Ready for Pickup!',
    body: 'Your order #{orderNumber} is ready. Show your QR code at {storeName}.',
  },
  [NotificationType.ORDER_COMPLETED]: {
    title: 'Order Complete',
    body: 'Thanks for picking up! You saved {savings} and helped reduce food waste.',
  },
  [NotificationType.ORDER_CANCELLED]: {
    title: 'Order Cancelled',
    body: 'Your order #{orderNumber} has been cancelled. Refund processing.',
  },
  [NotificationType.ORDER_EXPIRED]: {
    title: 'Order Expired',
    body: 'Your order #{orderNumber} expired. The pickup window has passed.',
  },
  [NotificationType.PICKUP_REMINDER]: {
    title: 'Pickup Reminder',
    body: "Don't forget! Pick up your order at {storeName} by {endTime}.",
  },
  [NotificationType.PRICE_DROP]: {
    title: 'Price Drop Alert!',
    body: '{productName} at {storeName} is now {price}!',
  },
  [NotificationType.NEW_OFFER]: {
    title: 'New at {storeName}',
    body: '{productName} just listed - grab it before it\'s gone!',
  },
  [NotificationType.PROMO]: {
    title: 'Special Offer',
    body: '{message}',
  },
  [NotificationType.REFERRAL]: {
    title: 'Referral Bonus!',
    body: '{message}',
  },
  [NotificationType.SELLER_APPROVED]: {
    title: 'Welcome to Mazza!',
    body: 'Your seller application has been approved. Start listing products!',
  },
  [NotificationType.SELLER_REJECTED]: {
    title: 'Application Update',
    body: 'Your seller application needs attention. Please review and resubmit.',
  },
  [NotificationType.SYSTEM]: {
    title: 'Mazza Update',
    body: '{message}',
  },
};
