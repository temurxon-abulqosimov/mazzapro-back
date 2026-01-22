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
import { User } from '@modules/identity/domain/entities/user.entity';

export enum SellerStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('sellers')
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: SellerStatus,
    default: SellerStatus.PENDING_REVIEW,
  })
  status: SellerStatus;

  @Column({ name: 'business_name' })
  businessName: string;

  @Column({ name: 'business_phone', type: 'varchar', length: 50, nullable: true })
  businessPhone: string | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'applied_at', type: 'timestamp' })
  appliedAt: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Domain methods
  approve(approvedBy: string): void {
    if (this.status !== SellerStatus.PENDING_REVIEW) {
      throw new Error(`Cannot approve seller with status ${this.status}`);
    }
    this.status = SellerStatus.APPROVED;
    this.approvedAt = new Date();
    this.approvedBy = approvedBy;
  }

  reject(reason: string): void {
    if (this.status !== SellerStatus.PENDING_REVIEW) {
      throw new Error(`Cannot reject seller with status ${this.status}`);
    }
    this.status = SellerStatus.REJECTED;
    this.rejectionReason = reason;
  }

  suspend(): void {
    if (this.status !== SellerStatus.APPROVED) {
      throw new Error(`Cannot suspend seller with status ${this.status}`);
    }
    this.status = SellerStatus.SUSPENDED;
  }

  reactivate(): void {
    if (this.status !== SellerStatus.SUSPENDED) {
      throw new Error(`Cannot reactivate seller with status ${this.status}`);
    }
    this.status = SellerStatus.APPROVED;
  }

  isApproved(): boolean {
    return this.status === SellerStatus.APPROVED;
  }

  isPending(): boolean {
    return this.status === SellerStatus.PENDING_REVIEW;
  }
}
