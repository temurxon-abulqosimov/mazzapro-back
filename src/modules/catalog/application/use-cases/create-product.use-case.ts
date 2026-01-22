import { Injectable, Inject } from '@nestjs/common';
import { Product, ProductStatus } from '../../domain/entities/product.entity';
import { ProductImage } from '../../domain/entities/product-image.entity';
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
import { CreateProductDto } from '../dto/product.dto';
import {
  EntityNotFoundException,
  DomainException,
  InvalidPickupWindowException,
} from '@common/exceptions';
import { parseTimeToDate } from '@common/utils/date.util';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {}

  async execute(userId: string, dto: CreateProductDto): Promise<Product> {
    // Get seller
    const seller = await this.sellerRepository.findByUserId(userId);
    if (!seller) {
      throw new EntityNotFoundException('Seller', userId);
    }
    if (!seller.isApproved()) {
      throw new DomainException('SELLER_NOT_APPROVED', 'Seller account not approved');
    }

    // Get store
    const store = await this.storeRepository.findBySellerId(seller.id);
    if (!store) {
      throw new EntityNotFoundException('Store', seller.id);
    }

    // Validate pickup window
    const today = new Date();
    const pickupStart = parseTimeToDate(dto.pickupWindowStart, today);
    const pickupEnd = parseTimeToDate(dto.pickupWindowEnd, today);

    if (pickupStart >= pickupEnd) {
      throw new InvalidPickupWindowException('Pickup start must be before end');
    }

    if (pickupEnd <= new Date()) {
      throw new InvalidPickupWindowException('Pickup window must be in the future');
    }

    // Validate pricing
    if (dto.discountedPrice >= dto.originalPrice) {
      throw new DomainException(
        'INVALID_PRICE',
        'Discounted price must be less than original price',
      );
    }

    // Create product
    const product = new Product();
    product.storeId = store.id;
    product.categoryId = dto.categoryId;
    product.name = dto.name;
    product.description = dto.description || null;
    product.originalPrice = dto.originalPrice;
    product.discountedPrice = dto.discountedPrice;
    product.quantity = dto.quantity;
    product.pickupWindowStart = pickupStart;
    product.pickupWindowEnd = pickupEnd;
    product.expiresAt = pickupEnd; // Expires when pickup window ends
    product.status = ProductStatus.ACTIVE; // Auto-publish

    // Add images if provided
    if (dto.imageIds && dto.imageIds.length > 0) {
      product.images = dto.imageIds.map((imageUrl, index) => {
        const image = new ProductImage();
        image.url = imageUrl; // In real impl, resolve from media service
        image.position = index;
        return image;
      });
    }

    return this.productRepository.save(product);
  }
}
