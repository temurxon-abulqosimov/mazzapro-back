import { Injectable, Inject } from '@nestjs/common';
import {
  ISellerRepository,
  SELLER_REPOSITORY,
} from '@modules/store/domain/repositories/seller.repository.interface';
import {
  IStoreRepository,
  STORE_REPOSITORY,
} from '@modules/store/domain/repositories/store.repository.interface';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '@modules/booking/domain/repositories/booking.repository.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { Booking } from '@modules/booking/domain/entities/booking.entity';

export interface LiveOrderDto {
  id: string;
  orderNumber: string;
  quantity: number;
  totalPrice: number;
  status: string;
  pickupWindowStart: Date;
  pickupWindowEnd: Date;
  createdAt: Date;
  customer: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  payment: {
    status: string;
  };
}

@Injectable()
export class GetLiveOrdersUseCase {
  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(userId: string): Promise<LiveOrderDto[]> {
    // Get seller
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new EntityNotFoundException('Seller', userId);
    }

    // Get store
    const store = await this.storeRepository.findBySellerId(seller.id);
    if (!store) {
      throw new EntityNotFoundException('Store', seller.id);
    }

    // Get active orders (CONFIRMED or READY status)
    const bookings = await this.bookingRepository.findByStoreId(store.id);

    // Filter active orders and sort by pickup time
    const activeBookings = bookings
      .filter((booking) => booking.isActive())
      .sort((a, b) => a.pickupWindowStart.getTime() - b.pickupWindowStart.getTime());

    // Map to DTOs
    return activeBookings.map((booking) => this.mapToDto(booking));
  }

  private mapToDto(booking: Booking): LiveOrderDto {
    return {
      id: booking.id,
      orderNumber: booking.orderNumber,
      quantity: booking.quantity,
      totalPrice: booking.totalPrice,
      status: booking.status,
      pickupWindowStart: booking.pickupWindowStart,
      pickupWindowEnd: booking.pickupWindowEnd,
      createdAt: booking.createdAt,
      customer: {
        id: booking.user.id,
        fullName: booking.user.fullName,
        avatarUrl: booking.user.avatarUrl || null,
      },
      product: {
        id: booking.product.id,
        name: booking.product.name,
        imageUrl: booking.product.images?.[0]?.url || null,
      },
      payment: {
        status: booking.payment?.status || 'PENDING',
      },
    };
  }
}
