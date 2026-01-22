import { Injectable, Inject } from '@nestjs/common';
import { Seller, SellerStatus } from '../../domain/entities/seller.entity';
import { Store } from '../../domain/entities/store.entity';
import {
  ISellerRepository,
  SELLER_REPOSITORY,
} from '../../domain/repositories/seller.repository.interface';
import {
  IStoreRepository,
  STORE_REPOSITORY,
} from '../../domain/repositories/store.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '@modules/identity/domain/repositories/user.repository.interface';
import { ApplySellerDto } from '../dto/seller.dto';
import { DomainException, EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class ApplySellerUseCase {
  constructor(
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, dto: ApplySellerDto): Promise<Seller> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    // Check if already applied
    const existingSeller = await this.sellerRepository.findByUserId(userId);
    if (existingSeller) {
      if (existingSeller.isPending()) {
        throw new DomainException(
          'SELLER_APPLICATION_PENDING',
          'You already have a pending seller application',
        );
      }
      if (existingSeller.isApproved()) {
        throw new DomainException(
          'ALREADY_SELLER',
          'You are already a registered seller',
        );
      }
    }

    // Create seller application
    const seller = new Seller();
    seller.userId = userId;
    seller.businessName = dto.businessName;
    seller.businessPhone = dto.phone || null;
    seller.status = SellerStatus.PENDING_REVIEW;
    seller.appliedAt = new Date();

    const savedSeller = await this.sellerRepository.save(seller);

    // Create store (will be activated when seller is approved)
    const store = new Store();
    store.sellerId = savedSeller.id;
    store.marketId = user.marketId;
    store.name = dto.businessName;
    store.description = dto.description || null;
    store.address = dto.address;
    store.city = dto.city;
    store.lat = dto.lat;
    store.lng = dto.lng;
    store.isActive = false; // Not active until approved

    await this.storeRepository.save(store);

    return savedSeller;
  }
}
