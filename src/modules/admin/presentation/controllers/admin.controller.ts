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

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboardStats(): Promise<AdminDashboardStatsDto> {
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

  @Post('sellers/:id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject seller application' })
  @ApiResponse({ status: 200, description: 'Application processed' })
  @ApiResponse({ status: 404, description: 'Seller not found' })
  @ApiResponse({ status: 400, description: 'Invalid action or missing reason' })
  async processSellerApplication(
    @Param('id', ParseUUIDPipe) sellerId: string,
    @Body() dto: ProcessSellerApplicationDto,
  ) {
    return this.processSellerApplicationUseCase.execute(
      sellerId,
      dto.action,
      dto.reason,
    );
  }
}
