import { Injectable, Inject, Logger } from '@nestjs/common';
import { IMediaRepository, MEDIA_REPOSITORY } from '../../domain/repositories';
import { MediaStatus } from '../../domain/entities/media.entity';
import { S3Service } from '../../infrastructure/services';
import { MediaResponseDto } from '../dto';
import { NotFoundException, ValidationException } from '@common/exceptions/domain.exception';

@Injectable()
export class ConfirmUploadUseCase {
  private readonly logger = new Logger(ConfirmUploadUseCase.name);

  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly mediaRepository: IMediaRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(userId: string, mediaId: string): Promise<MediaResponseDto> {
    const media = await this.mediaRepository.findById(mediaId);

    if (!media) {
      throw new NotFoundException(`Media with id ${mediaId} not found`);
    }

    if (media.userId !== userId) {
      throw new ValidationException('Media does not belong to user');
    }

    if (media.status !== MediaStatus.PENDING) {
      throw new ValidationException(`Media already ${media.status.toLowerCase()}`);
    }

    // Verify file exists in S3
    const { exists, size } = await this.s3Service.checkObjectExists(media.s3Key);

    if (!exists) {
      throw new ValidationException('File not uploaded yet');
    }

    // Update media status
    media.markUploaded(size || 0);

    // For now, mark as processed with public URL
    // In production, this would trigger an async processing job
    const publicUrl = this.s3Service.getPublicUrl(media.s3Key);
    media.markProcessed(publicUrl);

    const saved = await this.mediaRepository.save(media);

    this.logger.log(`Media ${mediaId} confirmed and processed`);

    return this.mapToResponse(saved);
  }

  private mapToResponse(media: any): MediaResponseDto {
    return {
      id: media.id,
      type: media.type,
      purpose: media.purpose,
      status: media.status,
      originalFilename: media.originalFilename,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      width: media.width,
      height: media.height,
      createdAt: media.createdAt,
    };
  }
}
