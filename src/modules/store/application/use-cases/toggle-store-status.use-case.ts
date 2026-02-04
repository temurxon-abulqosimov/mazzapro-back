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

export interface StoreStatusDto {
  isOpen: boolean;
}

@Injectable()
export class ToggleStoreStatusUseCase {
  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {}

  async execute(userId: string, isOpen: boolean): Promise<StoreStatusDto> {
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

    // Toggle store status
    if (isOpen) {
      store.open();
    } else {
      store.close();
    }

    // Save updated store
    await this.storeRepository.save(store);

    return {
      isOpen: store.isOpen,
    };
  }
}
