import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IStoreRepository, STORE_REPOSITORY } from '../../domain/repositories/store.repository.interface';
import { IBookingRepository, BOOKING_REPOSITORY } from '@modules/booking/domain/repositories/booking.repository.interface';
import { ISellerRepository, SELLER_REPOSITORY } from '../../domain/repositories/seller.repository.interface';

@Injectable()
export class GetDashboardStatsUseCase {
    constructor(
        @Inject(STORE_REPOSITORY)
        private readonly storeRepository: IStoreRepository,
        @Inject(BOOKING_REPOSITORY)
        private readonly bookingRepository: IBookingRepository,
        @Inject(SELLER_REPOSITORY)
        private readonly sellerRepository: ISellerRepository,
    ) { }

    async execute(userId: string): Promise<any> {
        const seller = await this.sellerRepository.findByUserId(userId);
        if (!seller) {
            throw new NotFoundException('Seller profile not found');
        }

        const store = await this.storeRepository.findBySellerId(seller.id);
        if (!store) {
            throw new NotFoundException('Store not found for this seller');
        }

        // This is a simplified implementation. Real implementation would aggregate data properly.
        return {
            period: 'today',
            posted: 0,
            postedChange: 0,
            sold: 0,
            revenue: 0,
            foodSaved: 0,
        };
    }
}
