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

export enum MediaType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
}

export enum MediaPurpose {
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
  STORE_IMAGE = 'STORE_IMAGE',
  USER_AVATAR = 'USER_AVATAR',
  SELLER_DOCUMENT = 'SELLER_DOCUMENT',
}

export enum MediaStatus {
  PENDING = 'PENDING',      // Presigned URL generated, awaiting upload
  UPLOADED = 'UPLOADED',    // File uploaded, awaiting processing
  PROCESSED = 'PROCESSED',  // Processed (resized, optimized)
  FAILED = 'FAILED',        // Processing failed
}

@Entity('media')
@Index(['userId', 'createdAt'])
@Index(['status'])
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: MediaType,
    default: MediaType.IMAGE,
  })
  type: MediaType;

  @Column({
    type: 'enum',
    enum: MediaPurpose,
  })
  purpose: MediaPurpose;

  @Column({
    type: 'enum',
    enum: MediaStatus,
    default: MediaStatus.PENDING,
  })
  status: MediaStatus;

  @Column({ name: 'original_filename' })
  originalFilename: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ name: 's3_bucket' })
  s3Bucket: string;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Column({ name: 'processing_error', type: 'text', nullable: true })
  processingError: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'uploaded_at', type: 'timestamp', nullable: true })
  uploadedAt: Date | null;

  @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
  processedAt: Date | null;

  markUploaded(fileSize: number): void {
    this.status = MediaStatus.UPLOADED;
    this.fileSize = fileSize;
    this.uploadedAt = new Date();
  }

  markProcessed(url: string, thumbnailUrl?: string, width?: number, height?: number): void {
    this.status = MediaStatus.PROCESSED;
    this.url = url;
    this.thumbnailUrl = thumbnailUrl || null;
    this.width = width || null;
    this.height = height || null;
    this.processedAt = new Date();
  }

  markFailed(error: string): void {
    this.status = MediaStatus.FAILED;
    this.processingError = error;
  }

  static create(params: {
    userId: string;
    type: MediaType;
    purpose: MediaPurpose;
    originalFilename: string;
    mimeType: string;
    s3Key: string;
    s3Bucket: string;
  }): Media {
    const media = new Media();
    media.userId = params.userId;
    media.type = params.type;
    media.purpose = params.purpose;
    media.originalFilename = params.originalFilename;
    media.mimeType = params.mimeType;
    media.s3Key = params.s3Key;
    media.s3Bucket = params.s3Bucket;
    media.status = MediaStatus.PENDING;
    return media;
  }
}
