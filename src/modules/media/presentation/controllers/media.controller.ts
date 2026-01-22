import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/types';
import {
  RequestUploadUrlDto,
  ConfirmUploadDto,
  UploadUrlResponseDto,
  MediaResponseDto,
} from '../../application/dto';
import {
  RequestUploadUrlUseCase,
  ConfirmUploadUseCase,
  DeleteMediaUseCase,
} from '../../application/use-cases';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MediaController {
  constructor(
    private readonly requestUploadUrlUseCase: RequestUploadUrlUseCase,
    private readonly confirmUploadUseCase: ConfirmUploadUseCase,
    private readonly deleteMediaUseCase: DeleteMediaUseCase,
  ) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Request a presigned URL for uploading media' })
  @ApiResponse({ status: 201, description: 'Presigned URL generated' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async requestUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestUploadUrlDto,
  ): Promise<UploadUrlResponseDto> {
    return this.requestUploadUrlUseCase.execute(
      user.id,
      dto.filename,
      dto.mimeType,
      dto.purpose,
      dto.fileSize,
    );
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm upload completion and trigger processing' })
  @ApiResponse({ status: 200, description: 'Upload confirmed' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  @ApiResponse({ status: 400, description: 'File not uploaded yet' })
  async confirmUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmUploadDto,
  ): Promise<MediaResponseDto> {
    return this.confirmUploadUseCase.execute(user.id, dto.mediaId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a media file' })
  @ApiResponse({ status: 200, description: 'Media deleted' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async deleteMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) mediaId: string,
  ): Promise<{ success: boolean }> {
    return this.deleteMediaUseCase.execute(user.id, mediaId);
  }
}
