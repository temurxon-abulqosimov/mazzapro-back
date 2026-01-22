import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Domain
import { Media } from './domain/entities/media.entity';
import { MEDIA_REPOSITORY } from './domain/repositories';

// Infrastructure
import { TypeOrmMediaRepository } from './infrastructure/repositories';
import { S3Service } from './infrastructure/services';

// Application
import {
  RequestUploadUrlUseCase,
  ConfirmUploadUseCase,
  DeleteMediaUseCase,
} from './application/use-cases';

// Presentation
import { MediaController } from './presentation/controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    ConfigModule,
  ],
  controllers: [MediaController],
  providers: [
    // Repositories
    {
      provide: MEDIA_REPOSITORY,
      useClass: TypeOrmMediaRepository,
    },

    // Services
    S3Service,

    // Use Cases
    RequestUploadUrlUseCase,
    ConfirmUploadUseCase,
    DeleteMediaUseCase,
  ],
  exports: [S3Service, MEDIA_REPOSITORY],
})
export class MediaModule {}
