import { Injectable, Inject } from '@nestjs/common';
import { IMediaRepository, MEDIA_REPOSITORY } from '../../domain/repositories';
import { Media, MediaType, MediaPurpose } from '../../domain/entities/media.entity';
import { S3Service } from '../../infrastructure/services';
import { UploadUrlResponseDto, AllowedMimeTypes, MaxFileSizes } from '../dto';
import { ValidationException } from '@common/exceptions/domain.exception';

@Injectable()
export class RequestUploadUrlUseCase {
  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly mediaRepository: IMediaRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(
    userId: string,
    filename: string,
    mimeType: string,
    purpose: MediaPurpose,
    fileSize?: number,
  ): Promise<UploadUrlResponseDto> {
    // Validate MIME type
    const allowedTypes = AllowedMimeTypes[purpose];
    if (!allowedTypes.includes(mimeType)) {
      throw new ValidationException(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Validate file size
    const maxSize = MaxFileSizes[purpose];
    if (fileSize && fileSize > maxSize) {
      throw new ValidationException(
        `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`,
      );
    }

    // Determine media type
    const type = mimeType.startsWith('image/') ? MediaType.IMAGE : MediaType.DOCUMENT;

    // Generate presigned URL
    const presigned = await this.s3Service.generatePresignedUploadUrl(
      userId,
      purpose,
      filename,
      mimeType,
      maxSize,
    );

    // Create media record
    const media = Media.create({
      userId,
      type,
      purpose,
      originalFilename: filename,
      mimeType,
      s3Key: presigned.s3Key,
      s3Bucket: presigned.s3Bucket,
    });

    const saved = await this.mediaRepository.save(media);

    return {
      mediaId: saved.id,
      uploadUrl: presigned.uploadUrl,
      s3Key: presigned.s3Key,
      expiresAt: presigned.expiresAt,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
    };
  }
}
