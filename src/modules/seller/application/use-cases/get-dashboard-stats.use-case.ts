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
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '@modules/catalog/domain/repositories/product.repository.interface';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '@modules/booking/domain/repositories/booking.repository.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { ProductStatus } from '@modules/catalog/domain/entities/product.entity';
import { BookingStatus } from '@modules/booking/domain/entities/booking.entity';

export interface DashboardStatsDto {
  todaysEarnings: number;
  earningsChange: number;
  ordersRescued: number;
  activeListings: number;
  isOpen: boolean;
}

@Injectable()
export class GetDashboardStatsUseCase {
  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(userId: string): Promise<DashboardStatsDto> {
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

    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = todayStart;

    // Get today's completed orders
    const todaysOrders = await this.bookingRepository.findByStoreIdAndDateRange(
      store.id,
      BookingStatus.COMPLETED,
      todayStart,
      todayEnd,
    );

    // Calculate today's earnings
    const todaysEarnings = todaysOrders.reduce(
      (sum, order) => sum + order.totalPrice,
      0,
    );

    // Get yesterday's completed orders
    const yesterdaysOrders = await this.bookingRepository.findByStoreIdAndDateRange(
      store.id,
      BookingStatus.COMPLETED,
      yesterdayStart,
      yesterdayEnd,
    );

    // Calculate yesterday's earnings
    const yesterdaysEarnings = yesterdaysOrders.reduce(
      (sum, order) => sum + order.totalPrice,
      0,
    );

    // Calculate earnings change percentage
    let earningsChange = 0;
    if (yesterdaysEarnings > 0) {
      earningsChange = Math.round(
        ((todaysEarnings - yesterdaysEarnings) / yesterdaysEarnings) * 100,
      );
    } else if (todaysEarnings > 0) {
      earningsChange = 100; // 100% increase if we had no earnings yesterday
    }

    // Count orders rescued (all completed orders for this store)
    const ordersRescued = await this.bookingRepository.countByStoreIdAndStatus(
      store.id,
      BookingStatus.COMPLETED,
    );

    // Count active listings
    const activeListings = await this.productRepository.countByStoreId(
      store.id,
      ProductStatus.ACTIVE,
    );

    return {
      todaysEarnings,
      earningsChange,
      ordersRescued,
      activeListings,
      isOpen: store.isOpen,
    };
  }
}
