import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { MediaPurpose } from '../../domain/entities/media.entity';

export interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
  s3Bucket: string;
  expiresAt: Date;
}

export interface PresignedDownloadResult {
  downloadUrl: string;
  expiresAt: Date;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client;
  private bucket: string;
  private region: string;
  private cdnUrl: string | null;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('aws.secretAccessKey');
    this.region = this.configService.get<string>('aws.region') || 'us-east-1';
    this.bucket = this.configService.get<string>('aws.s3Bucket') || 'mazza-media';
    this.cdnUrl = this.configService.get<string>('aws.cdnUrl') || null;

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS credentials not configured - S3 service disabled');
      return;
    }

    const endpoint = this.configService.get<string>('aws.s3Endpoint');

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      ...(endpoint && {
        endpoint,
        forcePathStyle: true, // Required for S3-compatible services like MinIO
      }),
    });

    this.initialized = true;
    this.logger.log(`S3 Service initialized (bucket: ${this.bucket})`);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async generatePresignedUploadUrl(
    userId: string,
    purpose: MediaPurpose,
    filename: string,
    mimeType: string,
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default
  ): Promise<PresignedUploadResult> {
    if (!this.initialized) {
      throw new Error('S3 service not initialized');
    }

    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const s3Key = this.generateS3Key(purpose, userId, extension);
    const expiresIn = 3600; // 1 hour

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      s3Key,
      s3Bucket: this.bucket,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async generatePresignedDownloadUrl(
    s3Key: string,
    expiresIn = 3600,
  ): Promise<PresignedDownloadResult> {
    if (!this.initialized) {
      throw new Error('S3 service not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async checkObjectExists(s3Key: string): Promise<{ exists: boolean; size?: number }> {
    if (!this.initialized) {
      return { exists: false };
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });
      const response = await this.client.send(command);
      return {
        exists: true,
        size: response.ContentLength,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      throw error;
    }
  }

  async deleteObject(s3Key: string): Promise<void> {
    if (!this.initialized) {
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    await this.client.send(command);
    this.logger.debug(`Deleted S3 object: ${s3Key}`);
  }

  getPublicUrl(s3Key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${s3Key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }

  private generateS3Key(purpose: MediaPurpose, userId: string, extension: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const uuid = uuidv4();

    const purposeFolder = this.getPurposeFolder(purpose);

    // Format: {purpose}/{year}/{month}/{day}/{userId}/{uuid}.{ext}
    return `${purposeFolder}/${year}/${month}/${day}/${userId}/${uuid}.${extension}`;
  }

  private getPurposeFolder(purpose: MediaPurpose): string {
    switch (purpose) {
      case MediaPurpose.PRODUCT_IMAGE:
        return 'products';
      case MediaPurpose.STORE_IMAGE:
        return 'stores';
      case MediaPurpose.USER_AVATAR:
        return 'avatars';
      case MediaPurpose.SELLER_DOCUMENT:
        return 'documents';
      default:
        return 'misc';
    }
  }
}
