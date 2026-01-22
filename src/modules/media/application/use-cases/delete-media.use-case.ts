import { Injectable, Inject, Logger } from '@nestjs/common';
import { IMediaRepository, MEDIA_REPOSITORY } from '../../domain/repositories';
import { S3Service } from '../../infrastructure/services';
import { NotFoundException, ValidationException } from '@common/exceptions/domain.exception';

@Injectable()
export class DeleteMediaUseCase {
  private readonly logger = new Logger(DeleteMediaUseCase.name);

  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly mediaRepository: IMediaRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(userId: string, mediaId: string): Promise<{ success: boolean }> {
    const media = await this.mediaRepository.findById(mediaId);

    if (!media) {
      throw new NotFoundException(`Media with id ${mediaId} not found`);
    }

    if (media.userId !== userId) {
      throw new ValidationException('Media does not belong to user');
    }

    // Delete from S3
    try {
      await this.s3Service.deleteObject(media.s3Key);
    } catch (error) {
      this.logger.warn(`Failed to delete S3 object ${media.s3Key}: ${error.message}`);
      // Continue with database deletion even if S3 fails
    }

    // Delete from database
    await this.mediaRepository.delete(mediaId);

    this.logger.log(`Media ${mediaId} deleted`);

    return { success: true };
  }
}
