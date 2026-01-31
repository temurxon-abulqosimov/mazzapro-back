import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/types';
import {
  ProcessSellerApplicationDto,
  GetPendingSellersDto,
  AdminDashboardStatsDto,
  SellerApplicationAction,
} from '../../application/dto';
import {
  GetPendingSellersUseCase,
  ProcessSellerApplicationUseCase,
  GetAdminStatsUseCase,
} from '../../application/use-cases';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly getPendingSellersUseCase: GetPendingSellersUseCase,
    private readonly processSellerApplicationUseCase: ProcessSellerApplicationUseCase,
    private readonly getAdminStatsUseCase: GetAdminStatsUseCase,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getStats(): Promise<AdminDashboardStatsDto> {
    return this.getAdminStatsUseCase.execute();
  }

  @Get('sellers/pending')
  @ApiOperation({ summary: 'Get pending seller applications' })
  @ApiResponse({ status: 200, description: 'List of pending sellers' })
  async getPendingSellers(
    @Query() dto: GetPendingSellersDto,
  ) {
    return this.getPendingSellersUseCase.execute(dto.limit || 20, dto.cursor);
  }

  @Post('sellers/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve seller application' })
  @ApiResponse({ status: 200, description: 'Seller approved' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  async approveSeller(
    @Param('id', ParseUUIDPipe) sellerId: string,
    @Request() req: any,
  ) {
    const adminUserId = req.user.id;
    return this.processSellerApplicationUseCase.execute(sellerId, SellerApplicationAction.APPROVE, adminUserId);
  }

  @Post('sellers/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject seller application' })
  @ApiResponse({ status: 200, description: 'Seller rejected' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 400, description: 'Missing rejection reason' })
  async rejectSeller(
    @Param('id', ParseUUIDPipe) sellerId: string,
    @Body() dto: { reason: string },
    @Request() req: any,
  ) {
    const adminUserId = req.user.id;
    return this.processSellerApplicationUseCase.execute(sellerId, SellerApplicationAction.REJECT, adminUserId, dto.reason);
  }
}
