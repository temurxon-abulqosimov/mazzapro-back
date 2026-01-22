import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
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
  GetNotificationsDto,
  MarkNotificationsReadDto,
  NotificationListResponseDto,
} from '../../application/dto';
import {
  GetNotificationsUseCase,
  MarkNotificationsReadUseCase,
} from '../../application/use-cases';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationController {
  constructor(
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly markNotificationsReadUseCase: MarkNotificationsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: GetNotificationsDto,
  ): Promise<NotificationListResponseDto> {
    return this.getNotificationsUseCase.execute(user.id, dto);
  }

  @Post('read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkNotificationsReadDto,
  ): Promise<{ markedCount: number }> {
    return this.markNotificationsReadUseCase.execute(user.id, dto.notificationIds);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ markedCount: number }> {
    return this.markNotificationsReadUseCase.executeMarkAll(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ unreadCount: number }> {
    const result = await this.getNotificationsUseCase.execute(user.id, { limit: 1 });
    return { unreadCount: result.unreadCount };
  }
}
