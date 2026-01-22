import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Media, MediaStatus, MediaPurpose } from '../../domain/entities/media.entity';
import { IMediaRepository } from '../../domain/repositories';

@Injectable()
export class TypeOrmMediaRepository implements IMediaRepository {
  constructor(
    @InjectRepository(Media)
    private readonly repository: Repository<Media>,
  ) {}

  async findById(id: string): Promise<Media | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByS3Key(s3Key: string): Promise<Media | null> {
    return this.repository.findOne({ where: { s3Key } });
  }

  async findByUserId(userId: string, purpose?: MediaPurpose): Promise<Media[]> {
    const where: any = { userId };
    if (purpose) {
      where.purpose = purpose;
    }
    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findPendingOlderThan(date: Date): Promise<Media[]> {
    return this.repository.find({
      where: {
        status: MediaStatus.PENDING,
        createdAt: LessThan(date),
      },
    });
  }

  async save(media: Media): Promise<Media> {
    return this.repository.save(media);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async updateStatus(id: string, status: MediaStatus, error?: string): Promise<void> {
    const update: any = { status };
    if (error) {
      update.processingError = error;
    }
    if (status === MediaStatus.PROCESSED) {
      update.processedAt = new Date();
    }
    await this.repository.update(id, update);
  }
}
