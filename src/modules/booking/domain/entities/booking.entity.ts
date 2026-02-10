import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@modules/identity/domain/entities/user.entity';
import { Product } from '@modules/catalog/domain/entities/product.entity';
import { Store } from '@modules/store/domain/entities/store.entity';
import { Payment } from './payment.entity';
import { Review } from '@modules/review/domain/entities/review.entity';
import { InvalidStateTransitionException } from '@common/exceptions';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

@Entity('bookings')
@Index(['userId', 'status'])
@Index(['storeId', 'status'])
@Index(['status', 'pickupWindowEnd'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', unique: true })
  @Index()
  orderNumber: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'product_id' })
  @Index()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'store_id' })
  @Index()
  storeId: string;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column()
  quantity: number;

  @Column({ name: 'unit_price' })
  unitPrice: number; // cents

  @Column({ name: 'total_price' })
  totalPrice: number; // cents

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  @Index()
  status: BookingStatus;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string | null;

  @Column({ name: 'qr_code_data', type: 'varchar', length: 255, nullable: true })
  qrCodeData: string | null;

  @Column({ name: 'pickup_window_start', type: 'timestamp with time zone' })
  pickupWindowStart: Date;

  @Column({ name: 'pickup_window_end', type: 'timestamp with time zone' })
  pickupWindowEnd: Date;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true, nullable: true })
  @Index()
  idempotencyKey: string | null;

  @OneToOne('Payment', (payment: Payment) => payment.booking, { cascade: true })
  payment: Payment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @OneToOne('Review', (review: Review) => review.booking)
  review: Review;

  // Domain methods
  confirm(): void {
    if (this.status !== BookingStatus.PENDING) {
      throw new InvalidStateTransitionException('Booking', this.status, BookingStatus.CONFIRMED);
    }
    this.status = BookingStatus.CONFIRMED;
    this.confirmedAt = new Date();
  }

  markReady(): void {
    if (this.status !== BookingStatus.CONFIRMED) {
      throw new InvalidStateTransitionException('Booking', this.status, BookingStatus.READY);
    }
    this.status = BookingStatus.READY;
  }

  complete(): void {
    if (this.status !== BookingStatus.READY && this.status !== BookingStatus.CONFIRMED) {
      throw new InvalidStateTransitionException('Booking', this.status, BookingStatus.COMPLETED);
    }
    this.status = BookingStatus.COMPLETED;
    this.completedAt = new Date();
  }

  cancel(reason?: string): void {
    if (
      this.status !== BookingStatus.CONFIRMED &&
      this.status !== BookingStatus.READY &&
      this.status !== BookingStatus.PENDING
    ) {
      throw new InvalidStateTransitionException('Booking', this.status, BookingStatus.CANCELLED);
    }
    this.status = BookingStatus.CANCELLED;
    this.cancelledAt = new Date();
    this.cancellationReason = reason || null;
  }

  markExpired(): void {
    if (
      this.status !== BookingStatus.CONFIRMED &&
      this.status !== BookingStatus.READY
    ) {
      throw new InvalidStateTransitionException('Booking', this.status, BookingStatus.EXPIRED);
    }
    this.status = BookingStatus.EXPIRED;
  }

  markFailed(): void {
    if (this.status !== BookingStatus.PENDING) {
      throw new InvalidStateTransitionException('Booking', this.status, BookingStatus.FAILED);
    }
    this.status = BookingStatus.FAILED;
  }

  isActive(): boolean {
    return (
      this.status === BookingStatus.CONFIRMED ||
      this.status === BookingStatus.READY
    );
  }

  canCancel(): boolean {
    return (
      this.status === BookingStatus.PENDING ||
      this.status === BookingStatus.CONFIRMED ||
      this.status === BookingStatus.READY
    );
  }

  get statusLabel(): string {
    const labels: Record<BookingStatus, string> = {
      [BookingStatus.PENDING]: 'Processing',
      [BookingStatus.CONFIRMED]: 'Paid & Confirmed',
      [BookingStatus.READY]: 'Ready for Pickup',
      [BookingStatus.COMPLETED]: 'Completed',
      [BookingStatus.CANCELLED]: 'Cancelled',
      [BookingStatus.EXPIRED]: 'Expired',
      [BookingStatus.FAILED]: 'Failed',
    };
    return labels[this.status];
  }
}
