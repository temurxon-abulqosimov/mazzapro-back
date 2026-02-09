import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import {
  ICategoryRepository,
  CATEGORY_REPOSITORY,
} from '@modules/store/domain/repositories/category.repository.interface';
import { getImagesForCategory } from '@config/category-images.config';
import { CreateProductDto } from '../dto/product.dto';
import { ProductCreatedEvent } from '../../domain/events/product-created.event';
import {
  EntityNotFoundException,
  DomainException,
  InvalidPickupWindowException,
} from '@common/exceptions';
import { parseTimeToDate } from '@common/utils/date.util';
import { RedisService } from '@common/redis/redis.service';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(SELLER_REPOSITORY)
    private readonly sellerRepository: ISellerRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
  ) { }

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
    const now = new Date();
    let pickupStart = parseTimeToDate(dto.pickupWindowStart, now);
    let pickupEnd = parseTimeToDate(dto.pickupWindowEnd, now);

    // If end time is earlier than or equal to start time, assume it's the next day
    if (pickupEnd <= pickupStart) {
      pickupEnd = new Date(pickupEnd.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
    }

    // If the pickup window has already passed today, shift to tomorrow
    if (pickupEnd <= now) {
      pickupStart = new Date(pickupStart.getTime() + 24 * 60 * 60 * 1000);
      pickupEnd = new Date(pickupEnd.getTime() + 24 * 60 * 60 * 1000);
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
    } else {
      // Assign default images from category icon (which is now a URL)
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (category && category.icon) {
        const image = new ProductImage();
        image.url = category.icon;
        image.position = 0;
        product.images = [image];
      }
    }

    const savedProduct = await this.productRepository.save(product);

    // Clear discovery cache so new products appear immediately
    await this.redisService.delPattern('discovery:products:*');

    // Emit event for notifications
    this.eventEmitter.emit(
      'product.created',
      new ProductCreatedEvent(
        savedProduct.id,
        savedProduct.storeId,
        store.name,
        savedProduct.name,
        savedProduct.originalPrice,
        savedProduct.discountedPrice,
        savedProduct.images && savedProduct.images.length > 0 ? savedProduct.images[0].url : null,
      ),
    );

    return savedProduct;
  }
}
