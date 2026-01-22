import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CAPTURED = 'CAPTURED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FAILED = 'FAILED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', unique: true })
  @Index()
  bookingId: string;

  @OneToOne(() => Booking, (booking) => booking.payment)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  amount: number; // cents

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @Index()
  status: PaymentStatus;

  @Column({ name: 'provider_tx_id', nullable: true })
  @Index()
  providerTxId: string | null; // Stripe charge/payment intent ID

  @Column({ name: 'provider_payment_method_id', nullable: true })
  providerPaymentMethodId: string | null;

  @Column({ name: 'idempotency_key', unique: true })
  @Index()
  idempotencyKey: string;

  @Column({ name: 'refunded_amount', default: 0 })
  refundedAmount: number;

  @Column({ name: 'refund_tx_id', nullable: true })
  refundTxId: string | null;

  @Column({ name: 'last4', nullable: true })
  last4: string | null;

  @Column({ name: 'card_brand', nullable: true })
  cardBrand: string | null;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Domain methods
  capture(providerTxId: string, last4?: string, cardBrand?: string): void {
    this.status = PaymentStatus.CAPTURED;
    this.providerTxId = providerTxId;
    this.last4 = last4 || null;
    this.cardBrand = cardBrand || null;
  }

  fail(reason: string): void {
    this.status = PaymentStatus.FAILED;
    this.failureReason = reason;
  }

  refund(refundTxId: string, amount?: number): void {
    const refundAmount = amount || this.amount;
    this.refundedAmount += refundAmount;
    this.refundTxId = refundTxId;

    if (this.refundedAmount >= this.amount) {
      this.status = PaymentStatus.REFUNDED;
    } else {
      this.status = PaymentStatus.PARTIALLY_REFUNDED;
    }
  }

  isCaptured(): boolean {
    return this.status === PaymentStatus.CAPTURED;
  }

  canRefund(): boolean {
    return (
      this.status === PaymentStatus.CAPTURED ||
      this.status === PaymentStatus.PARTIALLY_REFUNDED
    );
  }
}
