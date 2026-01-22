import { IsString, IsNumber, IsUUID, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../../domain/entities/booking.entity';
import { PaymentStatus } from '../../domain/entities/payment.entity';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  quantity: number;

  @ApiProperty({ description: 'Stripe PaymentMethod ID' })
  @IsString()
  paymentMethodId: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteBookingDto {
  @ApiProperty({ description: 'QR code data scanned from customer' })
  @IsString()
  qrCodeData: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty()
  statusLabel: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  pickupWindow: {
    start: Date;
    end: Date;
    label: string;
    dateLabel: string;
  };

  @ApiPropertyOptional()
  qrCode?: string;

  @ApiPropertyOptional()
  qrCodeData?: string;

  @ApiProperty()
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };

  @ApiProperty()
  store: {
    id: string;
    name: string;
    rating?: number;
    distance?: number;
    location: {
      address: string;
      lat: number;
      lng: number;
    };
  };

  @ApiProperty()
  payment: {
    status: PaymentStatus;
    amount: number;
    currency: string;
    last4?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

export class BookingListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty()
  statusLabel: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  pickupWindow: {
    start: Date;
    end: Date;
    label: string;
    dateLabel: string;
  };

  @ApiProperty()
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };

  @ApiProperty()
  store: {
    id: string;
    name: string;
    rating: number;
    distance?: number;
  };

  @ApiProperty()
  createdAt: Date;
}
