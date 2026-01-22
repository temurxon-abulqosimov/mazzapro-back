import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { IdempotencyKey } from '@common/decorators/idempotency-key.decorator';
import { AuthenticatedUser, UserRole } from '@common/types';
import { formatTimeRange, getDateLabel } from '@common/utils/date.util';
import {
  CreateBookingDto,
  CancelBookingDto,
  CompleteBookingDto,
  BookingResponseDto,
  BookingListItemDto,
} from '../../application/dto';
import {
  CreateBookingUseCase,
  GetUserBookingsUseCase,
  GetBookingByIdUseCase,
  CancelBookingUseCase,
  CompleteBookingUseCase,
} from '../../application/use-cases';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BookingController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getUserBookingsUseCase: GetUserBookingsUseCase,
    private readonly getBookingByIdUseCase: GetBookingByIdUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 bookings per minute per user
  @ApiOperation({ summary: 'Create a new booking (reserve product)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key for idempotent request',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Booking created' })
  @ApiResponse({ status: 409, description: 'Product out of stock or expired' })
  @ApiResponse({ status: 422, description: 'Payment failed' })
  async createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
    @IdempotencyKey() idempotencyKey: string,
  ): Promise<{ booking: BookingResponseDto }> {
    const booking = await this.createBookingUseCase.execute(
      user.id,
      dto,
      idempotencyKey,
    );

    return {
      booking: this.mapToResponse(booking),
    };
  }

  @Get()
  @ApiOperation({ summary: "Get user's bookings" })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  async getUserBookings(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: 'active' | 'past',
  ): Promise<{ bookings: BookingListItemDto[]; summary: { activeCount: number } }> {
    const bookings = await this.getUserBookingsUseCase.execute(user.id, status);

    const activeCount = bookings.filter((b) => b.isActive()).length;

    return {
      bookings: bookings.map((b) => ({
        id: b.id,
        orderNumber: b.orderNumber,
        status: b.status,
        statusLabel: b.statusLabel,
        quantity: b.quantity,
        totalPrice: b.totalPrice,
        pickupWindow: {
          start: b.pickupWindowStart,
          end: b.pickupWindowEnd,
          label: formatTimeRange(b.pickupWindowStart, b.pickupWindowEnd),
          dateLabel: getDateLabel(b.pickupWindowStart),
        },
        product: {
          id: b.product?.id || '',
          name: b.product?.name || '',
          imageUrl: b.product?.images?.[0]?.url || null,
        },
        store: {
          id: b.store?.id || '',
          name: b.store?.name || '',
          rating: Number(b.store?.rating || 0),
        },
        createdAt: b.createdAt,
      })),
      summary: { activeCount },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details with QR code' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getBookingById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ booking: BookingResponseDto }> {
    const booking = await this.getBookingByIdUseCase.execute(id, user.id);
    return {
      booking: this.mapToResponse(booking),
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  @ApiResponse({ status: 409, description: 'Cannot cancel booking' })
  async cancelBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
  ) {
    const booking = await this.cancelBookingUseCase.execute(id, user.id, dto.reason);
    return {
      booking: {
        id: booking.id,
        status: booking.status,
        refund: booking.payment
          ? {
              amount: booking.payment.refundedAmount,
              status: booking.payment.status,
            }
          : null,
      },
    };
  }

  private mapToResponse(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      orderNumber: booking.orderNumber,
      status: booking.status,
      statusLabel: booking.statusLabel,
      quantity: booking.quantity,
      unitPrice: booking.unitPrice,
      totalPrice: booking.totalPrice,
      pickupWindow: {
        start: booking.pickupWindowStart,
        end: booking.pickupWindowEnd,
        label: formatTimeRange(booking.pickupWindowStart, booking.pickupWindowEnd),
        dateLabel: getDateLabel(booking.pickupWindowStart),
      },
      qrCode: booking.qrCode,
      qrCodeData: booking.qrCodeData,
      product: {
        id: booking.product?.id || booking.productId,
        name: booking.product?.name || '',
        imageUrl: booking.product?.images?.[0]?.url || null,
      },
      store: {
        id: booking.store?.id || booking.storeId,
        name: booking.store?.name || '',
        location: {
          address: booking.store?.address || '',
          lat: Number(booking.store?.lat || 0),
          lng: Number(booking.store?.lng || 0),
        },
      },
      payment: {
        status: booking.payment?.status,
        amount: booking.payment?.amount || booking.totalPrice,
        currency: booking.payment?.currency || 'USD',
        last4: booking.payment?.last4,
      },
      createdAt: booking.createdAt,
      confirmedAt: booking.confirmedAt,
      completedAt: booking.completedAt,
    };
  }
}

@ApiTags('Seller')
@Controller('seller/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
@ApiBearerAuth('JWT-auth')
export class SellerOrderController {
  constructor(
    private readonly completeBookingUseCase: CompleteBookingUseCase,
  ) {}

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark order as picked up (scan QR)' })
  @ApiResponse({ status: 200, description: 'Order completed' })
  async completeOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteBookingDto,
  ) {
    // TODO: Get storeId from seller context
    const storeId = user.sellerId || '';
    const booking = await this.completeBookingUseCase.execute(
      user.id,
      storeId,
      dto.qrCodeData,
    );

    return {
      order: {
        id: booking.id,
        status: booking.status,
        completedAt: booking.completedAt,
      },
    };
  }
}
