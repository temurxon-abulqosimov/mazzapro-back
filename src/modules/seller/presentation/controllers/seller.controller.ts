import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '@common/types/request.type';
import { ApplyAsSellerUseCase } from '../../application/use-cases';
import { SellerApplicationDto } from '../../application/dto';

@ApiTags('Seller')
@Controller('seller')
export class SellerController {
  constructor(
    private readonly applyAsSellerUseCase: ApplyAsSellerUseCase,
  ) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a seller' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Application already exists' })
  async apply(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SellerApplicationDto,
  ) {
    const seller = await this.applyAsSellerUseCase.execute(req.user.id, dto);
    return {
      seller: {
        id: seller.id,
        status: seller.status,
        businessName: seller.businessName,
        appliedAt: seller.appliedAt,
      },
    };
  }
}
