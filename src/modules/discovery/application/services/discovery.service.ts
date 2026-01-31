import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product, ProductStatus } from '@modules/catalog/domain/entities/product.entity';
import { Store } from '@modules/store/domain/entities/store.entity';
import { Category } from '@modules/store/domain/entities/category.entity';
import { RedisService } from '@common/redis/redis.service';
import {
  DiscoverProductsDto,
  DiscoverStoresDto,
  SearchDto,
  SortOption,
  DiscoveryProductResponseDto,
} from '../dto/discovery.dto';
import { formatTimeRange } from '@common/utils/date.util';
import { decodeCursor, encodeCursor, createPaginatedResult } from '@common/utils/pagination.util';
import { PaginatedResult } from '@common/types';

@Injectable()
export class DiscoveryService {
  private readonly CACHE_TTL = 30; // 30 seconds

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly redisService: RedisService,
  ) {}

  async discoverProducts(
    dto: DiscoverProductsDto,
    userId?: string,
  ): Promise<PaginatedResult<DiscoveryProductResponseDto>> {
    const { lat, lng, radius = 5, category, categories, minPrice, maxPrice, sort, cursor, limit = 20 } = dto;

    // Build cache key
    const cacheKey = `discovery:products:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}:${category || ''}:${sort}`;

    // Try cache first (only for first page)
    if (!cursor) {
      const cached = await this.redisService.get<DiscoveryProductResponseDto[]>(cacheKey);
      if (cached) {
        return createPaginatedResult(cached, limit);
      }
    }

    // Get category IDs if filtering by category
    let categoryIds: string[] = [];
    if (category) {
      const cat = await this.categoryRepository.findOne({ where: { slug: category } });
      if (cat) categoryIds = [cat.id];
    } else if (categories) {
      const slugs = categories.split(',');
      const cats = await this.categoryRepository.find({ where: { slug: In(slugs) } });
      categoryIds = cats.map(c => c.id);
    }

    // Build query with Haversine formula for distance
    const distanceFormula = `(6371 * acos(cos(radians(:lat)) * cos(radians(store.lat)) * cos(radians(store.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(store.lat))))`;

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .addSelect(distanceFormula, 'distance')
      .where('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('store.is_active = :isActive', { isActive: true })
      .andWhere('product.expires_at > :now', { now: new Date() })
      .andWhere(`${distanceFormula} <= :radius`, { radius })
      .setParameter('lat', lat)
      .setParameter('lng', lng);

    // Category filter
    if (categoryIds.length > 0) {
      query.andWhere('product.category_id IN (:...categoryIds)', { categoryIds });
    }

    // Price filter
    if (minPrice !== undefined) {
      query.andWhere('product.discounted_price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      query.andWhere('product.discounted_price <= :maxPrice', { maxPrice });
    }

    // Sorting
    switch (sort) {
      case SortOption.DISTANCE:
        query.orderBy(distanceFormula, 'ASC');
        break;
      case SortOption.PRICE_ASC:
        query.orderBy('product.discounted_price', 'ASC');
        break;
      case SortOption.PRICE_DESC:
        query.orderBy('product.discounted_price', 'DESC');
        break;
      case SortOption.RECOMMENDED:
      default:
        // Recommended: combination of distance, rating, and freshness
        query.orderBy(distanceFormula, 'ASC').addOrderBy('store.rating', 'DESC');
        break;
    }

    // Cursor pagination
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query.andWhere('product.id > :lastId', { lastId: decoded.lastId });
      }
    }

    query.take(limit + 1);

    const { entities: products, raw } = await query.getRawAndEntities();

    // Map to response DTOs with distance
    const results: DiscoveryProductResponseDto[] = products.map((product, index) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      originalPrice: product.originalPrice,
      discountedPrice: product.discountedPrice,
      discountPercent: product.discountPercent,
      quantity: product.quantity,
      quantityAvailable: product.quantityAvailable,
      pickupWindow: {
        start: product.pickupWindowStart,
        end: product.pickupWindowEnd,
        label: formatTimeRange(product.pickupWindowStart, product.pickupWindowEnd),
      },
      status: product.status,
      images: product.images?.map(img => ({ url: img.url, position: img.position })) || [],
      store: {
        id: product.store.id,
        name: product.store.name,
        rating: Number(product.store.rating),
        imageUrl: product.store.imageUrl,
        location: {
          address: product.store.address,
          lat: Number(product.store.lat),
          lng: Number(product.store.lng),
        },
      },
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        icon: product.category.icon,
      },
      distance: raw[index]?.distance ? parseFloat(raw[index].distance) : 0,
    }));

    // Cache first page results
    if (!cursor && results.length > 0) {
      await this.redisService.set(cacheKey, results.slice(0, limit), this.CACHE_TTL);
    }

    return createPaginatedResult(results, limit, (item) => item.id);
  }

  async discoverStores(
    dto: DiscoverStoresDto,
    userId?: string,
  ): Promise<PaginatedResult<any>> {
    const { lat, lng, radius = 5, category, hasAvailability, cursor, limit = 20 } = dto;

    const query = this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.categories', 'category')
      .addSelect(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(store.lat)) * cos(radians(store.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(store.lat))))`,
        'distance',
      )
      .where('store.is_active = :isActive', { isActive: true })
      .having('distance <= :radius', { radius })
      .setParameter('lat', lat)
      .setParameter('lng', lng)
      .orderBy('distance', 'ASC');

    if (category) {
      query.andWhere('category.slug = :category', { category });
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query.andWhere('store.id > :lastId', { lastId: decoded.lastId });
      }
    }

    query.take(limit + 1);

    const { entities: stores, raw } = await query.getRawAndEntities();

    // Count available products per store
    const storeIds = stores.map(s => s.id);
    const productCounts = await this.productRepository
      .createQueryBuilder('product')
      .select('product.store_id', 'storeId')
      .addSelect('COUNT(*)', 'count')
      .where('product.store_id IN (:...storeIds)', { storeIds })
      .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
      .groupBy('product.store_id')
      .getRawMany();

    const countMap = new Map(productCounts.map(pc => [pc.storeId, parseInt(pc.count)]));

    let results = stores.map((store, index) => ({
      id: store.id,
      name: store.name,
      description: store.description,
      rating: Number(store.rating),
      reviewCount: store.reviewCount,
      imageUrl: store.imageUrl,
      location: {
        address: store.address,
        city: store.city,
        lat: Number(store.lat),
        lng: Number(store.lng),
      },
      categories: store.categories?.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })) || [],
      distance: raw[index]?.distance ? parseFloat(raw[index].distance) : 0,
      availableProducts: countMap.get(store.id) || 0,
    }));

    // Filter by availability if requested
    if (hasAvailability) {
      results = results.filter(r => r.availableProducts > 0);
    }

    return createPaginatedResult(results, limit, (item) => item.id);
  }

  async getMapMarkers(dto: any): Promise<any[]> {
    // Parse bounds
    const [swLat, swLng, neLat, neLng] = dto.bounds.split(',').map(Number);

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .where('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('store.is_active = :isActive', { isActive: true })
      .andWhere('store.lat BETWEEN :swLat AND :neLat', { swLat, neLat })
      .andWhere('store.lng BETWEEN :swLng AND :neLng', { swLng, neLng })
      .take(100) // Limit for performance
      .getMany();

    // For low zoom levels, cluster markers
    // For high zoom levels, return individual markers
    if (dto.zoom < 14) {
      // Simple grid-based clustering
      const gridSize = 0.01 * (15 - dto.zoom); // Adjust grid based on zoom
      const clusters = new Map<string, { lat: number; lng: number; count: number; products: any[] }>();

      for (const product of products) {
        const gridKey = `${Math.floor(Number(product.store.lat) / gridSize)}:${Math.floor(Number(product.store.lng) / gridSize)}`;
        if (!clusters.has(gridKey)) {
          clusters.set(gridKey, {
            lat: Number(product.store.lat),
            lng: Number(product.store.lng),
            count: 0,
            products: [],
          });
        }
        const cluster = clusters.get(gridKey)!;
        cluster.count++;
        cluster.products.push(product);
        // Update center to average
        cluster.lat = (cluster.lat * (cluster.count - 1) + Number(product.store.lat)) / cluster.count;
        cluster.lng = (cluster.lng * (cluster.count - 1) + Number(product.store.lng)) / cluster.count;
      }

      return Array.from(clusters.values()).map(cluster => {
        if (cluster.count === 1) {
          const p = cluster.products[0];
          return {
            type: 'product',
            id: p.id,
            lat: Number(p.store.lat),
            lng: Number(p.store.lng),
            price: p.discountedPrice,
            name: p.name.substring(0, 20),
            imageUrl: p.images?.[0]?.url,
          };
        }
        return {
          type: 'cluster',
          lat: cluster.lat,
          lng: cluster.lng,
          count: cluster.count,
        };
      });
    }

    // Return individual markers at high zoom
    return products.map(p => ({
      type: 'product',
      id: p.id,
      lat: Number(p.store.lat),
      lng: Number(p.store.lng),
      price: p.discountedPrice,
      name: p.name.substring(0, 20),
      imageUrl: p.images?.[0]?.url,
    }));
  }

  async search(dto: SearchDto): Promise<{ products: DiscoveryProductResponseDto[]; stores: any[] }> {
    const { q, lat, lng, radius = 10, limit = 20 } = dto;
    const searchTerm = `%${q.toLowerCase()}%`;

    // Search products
    const productQuery = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('store.is_active = :isActive', { isActive: true })
      .andWhere('product.expires_at > :now', { now: new Date() })
      .andWhere(
        '(LOWER(product.name) LIKE :searchTerm OR LOWER(product.description) LIKE :searchTerm OR LOWER(store.name) LIKE :searchTerm)',
        { searchTerm },
      );

    // Add geo-filtering if lat/lng provided
    if (lat !== undefined && lng !== undefined) {
      productQuery
        .addSelect(
          `(6371 * acos(cos(radians(:lat)) * cos(radians(store.lat)) * cos(radians(store.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(store.lat))))`,
          'distance',
        )
        .having('distance <= :radius', { radius })
        .setParameter('lat', lat)
        .setParameter('lng', lng)
        .orderBy('distance', 'ASC');
    } else {
      productQuery.orderBy('product.created_at', 'DESC');
    }

    productQuery.take(limit);

    const { entities: products, raw: productRaw } = await productQuery.getRawAndEntities();

    const productResults: DiscoveryProductResponseDto[] = products.map((product, index) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      originalPrice: product.originalPrice,
      discountedPrice: product.discountedPrice,
      discountPercent: product.discountPercent,
      quantity: product.quantity,
      quantityAvailable: product.quantityAvailable,
      pickupWindow: {
        start: product.pickupWindowStart,
        end: product.pickupWindowEnd,
        label: formatTimeRange(product.pickupWindowStart, product.pickupWindowEnd),
      },
      status: product.status,
      images: product.images?.map(img => ({ url: img.url, position: img.position })) || [],
      store: {
        id: product.store.id,
        name: product.store.name,
        rating: Number(product.store.rating),
        imageUrl: product.store.imageUrl,
        location: {
          address: product.store.address,
          lat: Number(product.store.lat),
          lng: Number(product.store.lng),
        },
      },
      category: {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        icon: product.category.icon,
      },
      distance: lat !== undefined && lng !== undefined && productRaw[index]?.distance
        ? parseFloat(productRaw[index].distance)
        : 0,
    }));

    // Search stores
    const storeQuery = this.storeRepository
      .createQueryBuilder('store')
      .leftJoinAndSelect('store.categories', 'category')
      .where('store.is_active = :isActive', { isActive: true })
      .andWhere(
        '(LOWER(store.name) LIKE :searchTerm OR LOWER(store.description) LIKE :searchTerm)',
        { searchTerm },
      );

    if (lat !== undefined && lng !== undefined) {
      storeQuery
        .addSelect(
          `(6371 * acos(cos(radians(:lat)) * cos(radians(store.lat)) * cos(radians(store.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(store.lat))))`,
          'distance',
        )
        .having('distance <= :radius', { radius })
        .setParameter('lat', lat)
        .setParameter('lng', lng)
        .orderBy('distance', 'ASC');
    } else {
      storeQuery.orderBy('store.rating', 'DESC');
    }

    storeQuery.take(limit);

    const { entities: stores, raw: storeRaw } = await storeQuery.getRawAndEntities();

    const storeResults = stores.map((store, index) => ({
      id: store.id,
      name: store.name,
      description: store.description,
      rating: Number(store.rating),
      reviewCount: store.reviewCount,
      imageUrl: store.imageUrl,
      location: {
        address: store.address,
        city: store.city,
        lat: Number(store.lat),
        lng: Number(store.lng),
      },
      categories: store.categories?.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })) || [],
      distance: lat !== undefined && lng !== undefined && storeRaw[index]?.distance
        ? parseFloat(storeRaw[index].distance)
        : 0,
    }));

    return {
      products: productResults,
      stores: storeResults,
    };
  }
}
