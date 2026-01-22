import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@modules/identity/domain/entities/user.entity';

export enum NotificationType {
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  PICKUP_READY = 'PICKUP_READY',
  PICKUP_REMINDER = 'PICKUP_REMINDER',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  PRICE_DROP = 'PRICE_DROP',
  NEW_OFFER = 'NEW_OFFER',
  PROMO = 'PROMO',
  REFERRAL = 'REFERRAL',
  SELLER_APPROVED = 'SELLER_APPROVED',
  SELLER_REJECTED = 'SELLER_REJECTED',
  SYSTEM = 'SYSTEM',
}

export enum NotificationCategory {
  ORDERS = 'orders',
  OFFERS = 'offers',
  SYSTEM = 'system',
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['userId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Column({ name: 'is_read', default: false })
  @Index()
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ name: 'push_sent', default: false })
  pushSent: boolean;

  @Column({ name: 'push_sent_at', type: 'timestamp', nullable: true })
  pushSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  get category(): NotificationCategory {
    const orderTypes = [
      NotificationType.ORDER_CONFIRMED,
      NotificationType.PICKUP_READY,
      NotificationType.PICKUP_REMINDER,
      NotificationType.ORDER_COMPLETED,
      NotificationType.ORDER_CANCELLED,
      NotificationType.ORDER_EXPIRED,
    ];

    const offerTypes = [
      NotificationType.PRICE_DROP,
      NotificationType.NEW_OFFER,
      NotificationType.PROMO,
      NotificationType.REFERRAL,
    ];

    if (orderTypes.includes(this.type)) {
      return NotificationCategory.ORDERS;
    }
    if (offerTypes.includes(this.type)) {
      return NotificationCategory.OFFERS;
    }
    return NotificationCategory.SYSTEM;
  }

  markAsRead(): void {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
    }
  }

  markPushSent(): void {
    this.pushSent = true;
    this.pushSentAt = new Date();
  }

  static create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    imageUrl?: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
  }): Notification {
    const notification = new Notification();
    notification.userId = params.userId;
    notification.type = params.type;
    notification.title = params.title;
    notification.body = params.body;
    notification.imageUrl = params.imageUrl || null;
    notification.data = params.data || null;
    notification.isRead = false;
    notification.pushSent = false;
    return notification;
  }
}
