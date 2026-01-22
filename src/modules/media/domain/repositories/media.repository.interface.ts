import { Media, MediaStatus, MediaPurpose } from '../entities/media.entity';

export interface IMediaRepository {
  findById(id: string): Promise<Media | null>;
  findByS3Key(s3Key: string): Promise<Media | null>;
  findByUserId(userId: string, purpose?: MediaPurpose): Promise<Media[]>;
  findPendingOlderThan(date: Date): Promise<Media[]>;
  save(media: Media): Promise<Media>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: MediaStatus, error?: string): Promise<void>;
}

export const MEDIA_REPOSITORY = Symbol('IMediaRepository');
