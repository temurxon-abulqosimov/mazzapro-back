import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
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
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser, UserRole } from '@common/types';
import {
  ApplySellerDto,
  SellerApplicationResponseDto,
  SellerDashboardResponseDto,
} from '../../application/dto';
import {
  ApplySellerUseCase,
  GetSellerDashboardUseCase,
} from '../../application/use-cases';

@ApiTags('Seller')
@Controller('seller')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SellerController {
  constructor(
    private readonly applySellerUseCase: ApplySellerUseCase,
    private readonly getSellerDashboardUseCase: GetSellerDashboardUseCase,
  ) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply to become a seller' })
  @ApiResponse({ status: 201, description: 'Application submitted' })
  @ApiResponse({ status: 409, description: 'Already applied or seller' })
  async apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplySellerDto,
  ): Promise<{ application: SellerApplicationResponseDto }> {
    const seller = await this.applySellerUseCase.execute(user.id, dto);
    return {
      application: {
        id: seller.id,
        status: seller.status,
        businessName: seller.businessName,
        submittedAt: seller.appliedAt,
      },
    };
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER)
  @ApiOperation({ summary: 'Get seller dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SellerDashboardResponseDto> {
    return this.getSellerDashboardUseCase.execute(user.id);
  }
}
