import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum SellerApplicationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ProcessSellerApplicationDto {
  @ApiProperty({ enum: SellerApplicationAction })
  @IsEnum(SellerApplicationAction)
  action: SellerApplicationAction;

  @ApiPropertyOptional({ description: 'Rejection reason (required if rejecting)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetPendingSellersDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  cursor?: string;
}

export class PendingSellerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  businessName: string;

  @ApiProperty()
  businessType: string;

  @ApiProperty()
  contactEmail: string;

  @ApiProperty()
  contactPhone: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  appliedAt: Date;

  @ApiProperty()
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export class AdminDashboardStatsDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalSellers: number;

  @ApiProperty()
  pendingSellerApplications: number;

  @ApiProperty()
  totalStores: number;

  @ApiProperty()
  activeProducts: number;

  @ApiProperty()
  totalBookings: number;

  @ApiProperty()
  completedBookings: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  mealsSaved: number;

  @ApiProperty()
  co2Saved: number;
}

export class AdminBookingListDto {
  @ApiPropertyOptional()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  endDate?: string;
}
