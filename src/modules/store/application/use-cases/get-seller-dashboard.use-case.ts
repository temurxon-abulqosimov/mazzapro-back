import { Injectable, Inject } from '@nestjs/common';
import {
  ISellerRepository,
  SELLER_REPOSITORY,
} from '../../domain/repositories/seller.repository.interface';
import {
  IStoreRepository,
  STORE_REPOSITORY,
} from '../../domain/repositories/store.repository.interface';
import { EntityNotFoundException, DomainException } from '@common/exceptions';

interface DashboardResult {
  store: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  stats: {
    period: string;
    posted: number;
    postedChange: number;
    sold: number;
    revenue: number;
    foodSaved: number;
  };
}

@Injectable()
export class GetSellerDashboardUseCase {
  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {}

  async execute(userId: string): Promise<DashboardResult> {
    // Get seller
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new EntityNotFoundException('Seller', userId);
    }

    if (!seller.isApproved()) {
      throw new DomainException(
        'SELLER_NOT_APPROVED',
        'Your seller account is not approved',
      );
    }

    // Get store
    const store = await this.storeRepository.findBySellerId(seller.id);
    if (!store) {
      throw new EntityNotFoundException('Store', seller.id);
    }

    // TODO: Calculate actual stats from products and bookings
    return {
      store: {
        id: store.id,
        name: store.name,
        imageUrl: store.imageUrl,
      },
      stats: {
        period: 'all_time',
        posted: 0, // TODO: Count from products
        postedChange: 0,
        sold: store.totalProductsSold,
        revenue: store.totalRevenue,
        foodSaved: Number(store.foodSavedKg),
      },
    };
  }
}
