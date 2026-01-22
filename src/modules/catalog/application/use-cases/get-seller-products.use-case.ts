import { Injectable, Inject } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import {
  IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository.interface';
import {
  ISellerRepository,
  SELLER_REPOSITORY,
} from '@modules/store/domain/repositories/seller.repository.interface';
import {
  IStoreRepository,
  STORE_REPOSITORY,
} from '@modules/store/domain/repositories/store.repository.interface';
import { EntityNotFoundException, DomainException } from '@common/exceptions';

@Injectable()
export class GetSellerProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {}

  async execute(userId: string): Promise<Product[]> {
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new EntityNotFoundException('Seller', userId);
    }
    if (!seller.isApproved()) {
      throw new DomainException('SELLER_NOT_APPROVED', 'Seller account not approved');
    }

    const store = await this.storeRepository.findBySellerId(seller.id);
    if (!store) {
      throw new EntityNotFoundException('Store', seller.id);
    }

    return this.productRepository.findActiveByStoreId(store.id);
  }
}
