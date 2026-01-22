import { IsEnum, IsString, IsOptional, IsInt, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaPurpose, MediaType, MediaStatus } from '../../domain/entities/media.entity';

export class RequestUploadUrlDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'MIME type (e.g., image/jpeg)' })
  @IsString()
  mimeType: string;

  @ApiProperty({ enum: MediaPurpose })
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;

  @ApiPropertyOptional({ description: 'File size in bytes (for validation)' })
  @IsOptional()
  @IsInt()
  @Max(50 * 1024 * 1024) // 50MB max
  fileSize?: number;
}

export class ConfirmUploadDto {
  @ApiProperty({ description: 'Media ID from presigned URL response' })
  @IsUUID()
  mediaId: string;
}

export class UploadUrlResponseDto {
  @ApiProperty()
  mediaId: string;

  @ApiProperty()
  uploadUrl: string;

  @ApiProperty()
  s3Key: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ description: 'HTTP method to use for upload' })
  method: 'PUT';

  @ApiProperty({ description: 'Headers to include in upload request' })
  headers: Record<string, string>;
}

export class MediaResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: MediaType })
  type: MediaType;

  @ApiProperty({ enum: MediaPurpose })
  purpose: MediaPurpose;

  @ApiProperty({ enum: MediaStatus })
  status: MediaStatus;

  @ApiProperty()
  originalFilename: string;

  @ApiPropertyOptional()
  url?: string | null;

  @ApiPropertyOptional()
  thumbnailUrl?: string | null;

  @ApiPropertyOptional()
  width?: number | null;

  @ApiPropertyOptional()
  height?: number | null;

  @ApiProperty()
  createdAt: Date;
}

// Allowed MIME types by purpose
export const AllowedMimeTypes: Record<MediaPurpose, string[]> = {
  [MediaPurpose.PRODUCT_IMAGE]: ['image/jpeg', 'image/png', 'image/webp'],
  [MediaPurpose.STORE_IMAGE]: ['image/jpeg', 'image/png', 'image/webp'],
  [MediaPurpose.USER_AVATAR]: ['image/jpeg', 'image/png', 'image/webp'],
  [MediaPurpose.SELLER_DOCUMENT]: ['image/jpeg', 'image/png', 'application/pdf'],
};

// Max file sizes by purpose (in bytes)
export const MaxFileSizes: Record<MediaPurpose, number> = {
  [MediaPurpose.PRODUCT_IMAGE]: 10 * 1024 * 1024,   // 10MB
  [MediaPurpose.STORE_IMAGE]: 10 * 1024 * 1024,     // 10MB
  [MediaPurpose.USER_AVATAR]: 5 * 1024 * 1024,      // 5MB
  [MediaPurpose.SELLER_DOCUMENT]: 20 * 1024 * 1024, // 20MB
};
