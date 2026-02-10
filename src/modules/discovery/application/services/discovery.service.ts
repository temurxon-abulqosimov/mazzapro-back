import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { decodeCursor, createPaginatedResult } from '@common/utils/pagination.util';
import { PaginatedResult } from '@common/types';
import { IFavoriteRepository, FAVORITE_REPOSITORY } from '@modules/favorite/domain/repositories';

// Haversine distance formula for PostgreSQL
const HAVERSINE_SQL = (latParam: string, lngParam: string, latCol: string, lngCol: string) => `
  (6371 * acos(
    LEAST(1.0, GREATEST(-1.0,
      cos(radians(:${latParam})) * cos(radians(${latCol})) *
      cos(radians(${lngCol}) - radians(:${lngParam})) +
      sin(radians(:${latParam})) * sin(radians(${latCol}))
    ))
  ))
`;

interface RawProductResult {
  product_id: string;
  product_name: string;
  product_description: string | null;
  product_original_price: number;
  product_discounted_price: number;
  product_quantity: number;
  product_quantity_reserved: number; // Changed from quantity_available
  product_pickup_window_start: Date;
  product_pickup_window_end: Date;
  product_status: string;
  store_id: string;
  store_name: string;
  store_rating: string;
  store_image_url: string | null;
  store_address: string;
  store_lat: string;
  store_lng: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_icon: string | null;
  distance: string;
}

interface RawStoreResult {
  store_id: string;
  store_name: string;
  store_description: string | null;
  store_rating: string;
  store_review_count: number;
  store_image_url: string | null;
  store_address: string;
  store_city: string;
  store_lat: string;
  store_lng: string;
  distance: string;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);
  private readonly CACHE_TTL = 10; // 10 seconds

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepository: IFavoriteRepository,
    private readonly redisService: RedisService,
  ) { }

  async discoverProducts(
    dto: DiscoverProductsDto,
    userId?: string,
  ): Promise<PaginatedResult<DiscoveryProductResponseDto>> {
    const { lat, lng, radius = 5, category, categories, minPrice, maxPrice, sort, cursor, limit = 20 } = dto;

    this.logger.log(`Discovery request: lat=${lat}, lng=${lng}, radius=${radius}, category=${category}`);

    // Build cache key
    const cacheKey = `discovery:products:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}:${category || ''}:${sort}`;

    // Try cache first (only for first page)
    if (!cursor) {
      const cached = await this.redisService.get<DiscoveryProductResponseDto[]>(cacheKey);
      if (cached) {
        if (userId) {
          const favoriteProductIds = await this.favoriteRepository.getProductIdsByUserId(userId);
          const favoriteSet = new Set(favoriteProductIds);
          return createPaginatedResult(
            cached.map(p => ({ ...p, isFavorited: favoriteSet.has(p.id) })),
            limit
          );
        }
        return createPaginatedResult(cached, limit);
      }
    }

    // Get category IDs if filtering by category
    let categoryIds: string[] = [];
    if (category) {
      const cat = await this.categoryRepository.findOne({ where: { slug: category } });
      if (cat) {
        categoryIds = [cat.id];
      } else {
        // Category not found, return empty result
        return createPaginatedResult([], limit);
      }
    } else if (categories) {
      const slugs = categories.split(',');
      const cats = await this.categoryRepository.find({ where: { slug: In(slugs) } });
      if (cats.length > 0) {
        categoryIds = cats.map(c => c.id);
      } else {
        // Categories not found, return empty result
        return createPaginatedResult([], limit);
      }
    }

    // Build query with SQL distance calculation
    const distanceFormula = HAVERSINE_SQL('lat', 'lng', 'store.lat', 'store.lng');

    const query = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.store', 'store')
      .innerJoin('product.category', 'category')
      .select([
        'product.id AS product_id',
        'product.name AS product_name',
        'product.description AS product_description',
        'product.original_price AS product_original_price',
        'product.discounted_price AS product_discounted_price',
        'product.quantity AS product_quantity',
        'product.quantity_reserved AS product_quantity_reserved',
        'product.pickup_window_start AS product_pickup_window_start',
        'product.pickup_window_end AS product_pickup_window_end',
        'product.status AS product_status',
        'store.id AS store_id',
        'store.name AS store_name',
        'store.rating AS store_rating',
        'store.image_url AS store_image_url',
        'store.address AS store_address',
        'store.lat AS store_lat',
        'store.lng AS store_lng',
        'category.id AS category_id',
        'category.name AS category_name',
        'category.slug AS category_slug',
        'category.icon AS category_icon',
        `${distanceFormula} AS distance`,
      ])
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
    if (sort === SortOption.PRICE_ASC) {
      query.orderBy('product.discounted_price', 'ASC');
    } else if (sort === SortOption.PRICE_DESC) {
      query.orderBy('product.discounted_price', 'DESC');
    } else if (sort === SortOption.DISTANCE) {
      query.orderBy('distance', 'ASC');
    } else {
      // RECOMMENDED: distance first, then rating
      query.orderBy('distance', 'ASC').addOrderBy('store.rating', 'DESC');
    }

    // Cursor pagination
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query.andWhere('product.id > :lastId', { lastId: decoded.lastId });
      }
    }

    query.limit(limit + 1);

    const rawProducts: RawProductResult[] = await query.getRawMany();

    this.logger.log(`Discovery query returned ${rawProducts.length} products`);

    // Get images for products (separate query to avoid complex joins)
    const productIds = rawProducts.map(p => p.product_id);
    let imagesMap = new Map<string, { url: string; position: number }[]>();

    if (productIds.length > 0) {
      const images = await this.productRepository
        .createQueryBuilder('product')
        .innerJoin('product.images', 'image')
        .select(['product.id AS product_id', 'image.url AS url', 'image.position AS position'])
        .where('product.id IN (:...productIds)', { productIds })
        .orderBy('image.position', 'ASC')
        .getRawMany();

      for (const img of images) {
        if (!imagesMap.has(img.product_id)) {
          imagesMap.set(img.product_id, []);
        }
        imagesMap.get(img.product_id)!.push({ url: img.url, position: img.position });
      }
    }

    // Get favorites if user logged in
    let favoriteSet = new Set<string>();
    if (userId) {
      const favoriteProductIds = await this.favoriteRepository.getProductIdsByUserId(userId);
      favoriteSet = new Set(favoriteProductIds);
    }

    // Map raw results to DTOs
    const results: DiscoveryProductResponseDto[] = rawProducts.map((raw) => {
      const originalPrice = Number(raw.product_original_price);
      const discountedPrice = Number(raw.product_discounted_price);
      const discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);

      return {
        id: raw.product_id,
        name: raw.product_name,
        description: raw.product_description,
        originalPrice,
        discountedPrice,
        discountPercent,
        quantity: Number(raw.product_quantity),
        quantityAvailable: Number(raw.product_quantity) - Number(raw.product_quantity_reserved),
        pickupWindow: {
          start: new Date(raw.product_pickup_window_start),
          end: new Date(raw.product_pickup_window_end),
          label: formatTimeRange(
            new Date(raw.product_pickup_window_start),
            new Date(raw.product_pickup_window_end)
          ),
        },
        status: raw.product_status,
        images: imagesMap.get(raw.product_id) || [],
        store: {
          id: raw.store_id,
          name: raw.store_name,
          rating: Number(raw.store_rating),
          imageUrl: raw.store_image_url,
          location: {
            address: raw.store_address,
            lat: Number(raw.store_lat),
            lng: Number(raw.store_lng),
          },
        },
        category: {
          id: raw.category_id,
          name: raw.category_name,
          slug: raw.category_slug,
          icon: raw.category_icon,
        },
        distance: Number(raw.distance),
        isFavorited: favoriteSet.has(raw.product_id),
      };
    });

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

    const distanceFormula = HAVERSINE_SQL('lat', 'lng', 'store.lat', 'store.lng');

    const query = this.storeRepository
      .createQueryBuilder('store')
      .select([
        'store.id AS store_id',
        'store.name AS store_name',
        'store.description AS store_description',
        'store.rating AS store_rating',
        'store.review_count AS store_review_count',
        'store.image_url AS store_image_url',
        'store.address AS store_address',
        'store.city AS store_city',
        'store.lat AS store_lat',
        'store.lng AS store_lng',
        `${distanceFormula} AS distance`,
      ])
      .where('store.is_active = :isActive', { isActive: true })
      .andWhere(`${distanceFormula} <= :radius`, { radius })
      .setParameter('lat', lat)
      .setParameter('lng', lng)
      .orderBy('distance', 'ASC');

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded) {
        query.andWhere('store.id > :lastId', { lastId: decoded.lastId });
      }
    }

    query.limit(100);

    const rawStores: RawStoreResult[] = await query.getRawMany();

    // Get categories for stores
    const storeIds = rawStores.map(s => s.store_id);
    let categoriesMap = new Map<string, { id: string; name: string; slug: string }[]>();

    if (storeIds.length > 0) {
      const storeCategories = await this.storeRepository
        .createQueryBuilder('store')
        .innerJoin('store.categories', 'category')
        .select([
          'store.id AS store_id',
          'category.id AS category_id',
          'category.name AS category_name',
          'category.slug AS category_slug',
        ])
        .where('store.id IN (:...storeIds)', { storeIds })
        .getRawMany();

      for (const sc of storeCategories) {
        if (!categoriesMap.has(sc.store_id)) {
          categoriesMap.set(sc.store_id, []);
        }
        categoriesMap.get(sc.store_id)!.push({
          id: sc.category_id,
          name: sc.category_name,
          slug: sc.category_slug,
        });
      }

      // Filter by category if specified
      if (category) {
        const filteredStoreIds = new Set<string>();
        for (const [storeId, cats] of categoriesMap) {
          if (cats.some(c => c.slug === category)) {
            filteredStoreIds.add(storeId);
          }
        }
        // Filter rawStores
        const filteredRawStores = rawStores.filter(s => filteredStoreIds.has(s.store_id));
        rawStores.length = 0;
        rawStores.push(...filteredRawStores);
      }
    }

    // Count available products per store
    let productCounts: { storeId: string; count: string }[] = [];
    if (storeIds.length > 0) {
      productCounts = await this.productRepository
        .createQueryBuilder('product')
        .select('product.store_id', 'storeId')
        .addSelect('COUNT(*)', 'count')
        .where('product.store_id IN (:...storeIds)', { storeIds })
        .andWhere('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('product.expires_at > :now', { now: new Date() })
        .groupBy('product.store_id')
        .getRawMany();
    }

    const countMap = new Map(productCounts.map(pc => [pc.storeId, parseInt(pc.count)]));

    let results = rawStores.map((raw) => ({
      id: raw.store_id,
      name: raw.store_name,
      description: raw.store_description,
      rating: Number(raw.store_rating),
      reviewCount: Number(raw.store_review_count),
      imageUrl: raw.store_image_url,
      location: {
        address: raw.store_address,
        city: raw.store_city,
        lat: Number(raw.store_lat),
        lng: Number(raw.store_lng),
      },
      categories: categoriesMap.get(raw.store_id) || [],
      distance: Number(raw.distance),
      availableProducts: countMap.get(raw.store_id) || 0,
    }));

    // Filter by availability if requested
    if (hasAvailability) {
      results = results.filter(r => r.availableProducts > 0);
    }

    // Slice to limit
    results = results.slice(0, limit + 1);

    return createPaginatedResult(results, limit, (item) => item.id);
  }

  async getMapMarkers(dto: any): Promise<any[]> {
    // Parse bounds
    const [swLat, swLng, neLat, neLng] = dto.bounds.split(',').map(Number);

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.store', 'store')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('store.is_active = :isActive', { isActive: true })
      .andWhere('store.lat BETWEEN :swLat AND :neLat', { swLat, neLat })
      .andWhere('store.lng BETWEEN :swLng AND :neLng', { swLng, neLng })
      .take(100)
      .getMany();

    // For low zoom levels, cluster markers
    if (dto.zoom < 14) {
      const gridSize = 0.01 * (15 - dto.zoom);
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
    const hasGeo = lat !== undefined && lng !== undefined;

    // Search products
    let productQuery = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.store', 'store')
      .innerJoin('product.category', 'category');

    const selectFields = [
      'product.id AS product_id',
      'product.name AS product_name',
      'product.description AS product_description',
      'product.original_price AS product_original_price',
      'product.discounted_price AS product_discounted_price',
      'product.quantity AS product_quantity',
      'product.quantity_reserved AS product_quantity_reserved',
      'product.pickup_window_start AS product_pickup_window_start',
      'product.pickup_window_end AS product_pickup_window_end',
      'product.status AS product_status',
      'store.id AS store_id',
      'store.name AS store_name',
      'store.rating AS store_rating',
      'store.image_url AS store_image_url',
      'store.address AS store_address',
      'store.lat AS store_lat',
      'store.lng AS store_lng',
      'category.id AS category_id',
      'category.name AS category_name',
      'category.slug AS category_slug',
      'category.icon AS category_icon',
    ];

    if (hasGeo) {
      const distanceFormula = HAVERSINE_SQL('lat', 'lng', 'store.lat', 'store.lng');
      selectFields.push(`${distanceFormula} AS distance`);
      productQuery = productQuery
        .select(selectFields)
        .setParameter('lat', lat)
        .setParameter('lng', lng)
        .where('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('store.is_active = :isActive', { isActive: true })
        .andWhere('product.expires_at > :now', { now: new Date() })
        .andWhere(
          '(LOWER(product.name) LIKE :searchTerm OR LOWER(product.description) LIKE :searchTerm OR LOWER(store.name) LIKE :searchTerm)',
          { searchTerm },
        )
        .andWhere(`${distanceFormula} <= :radius`, { radius })
        .orderBy('distance', 'ASC');
    } else {
      selectFields.push('0 AS distance');
      productQuery = productQuery
        .select(selectFields)
        .where('product.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('store.is_active = :isActive', { isActive: true })
        .andWhere('product.expires_at > :now', { now: new Date() })
        .andWhere(
          '(LOWER(product.name) LIKE :searchTerm OR LOWER(product.description) LIKE :searchTerm OR LOWER(store.name) LIKE :searchTerm)',
          { searchTerm },
        )
        .orderBy('product.created_at', 'DESC');
    }

    productQuery.limit(limit);

    const rawProducts: RawProductResult[] = await productQuery.getRawMany();

    // Get images for products
    const productIds = rawProducts.map(p => p.product_id);
    let imagesMap = new Map<string, { url: string; position: number }[]>();

    if (productIds.length > 0) {
      const images = await this.productRepository
        .createQueryBuilder('product')
        .innerJoin('product.images', 'image')
        .select(['product.id AS product_id', 'image.url AS url', 'image.position AS position'])
        .where('product.id IN (:...productIds)', { productIds })
        .orderBy('image.position', 'ASC')
        .getRawMany();

      for (const img of images) {
        if (!imagesMap.has(img.product_id)) {
          imagesMap.set(img.product_id, []);
        }
        imagesMap.get(img.product_id)!.push({ url: img.url, position: img.position });
      }
    }

    const productResults: DiscoveryProductResponseDto[] = rawProducts.map((raw) => {
      const originalPrice = Number(raw.product_original_price);
      const discountedPrice = Number(raw.product_discounted_price);
      const discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);

      return {
        id: raw.product_id,
        name: raw.product_name,
        description: raw.product_description,
        originalPrice,
        discountedPrice,
        discountPercent,
        quantity: Number(raw.product_quantity),
        quantityAvailable: Number(raw.product_quantity) - Number(raw.product_quantity_reserved),
        pickupWindow: {
          start: new Date(raw.product_pickup_window_start),
          end: new Date(raw.product_pickup_window_end),
          label: formatTimeRange(
            new Date(raw.product_pickup_window_start),
            new Date(raw.product_pickup_window_end)
          ),
        },
        status: raw.product_status,
        images: imagesMap.get(raw.product_id) || [],
        store: {
          id: raw.store_id,
          name: raw.store_name,
          rating: Number(raw.store_rating),
          imageUrl: raw.store_image_url,
          location: {
            address: raw.store_address,
            lat: Number(raw.store_lat),
            lng: Number(raw.store_lng),
          },
        },
        category: {
          id: raw.category_id,
          name: raw.category_name,
          slug: raw.category_slug,
          icon: raw.category_icon,
        },
        distance: Number(raw.distance),
      };
    });

    // Search stores
    let storeQuery = this.storeRepository.createQueryBuilder('store');

    const storeSelectFields = [
      'store.id AS store_id',
      'store.name AS store_name',
      'store.description AS store_description',
      'store.rating AS store_rating',
      'store.review_count AS store_review_count',
      'store.image_url AS store_image_url',
      'store.address AS store_address',
      'store.city AS store_city',
      'store.lat AS store_lat',
      'store.lng AS store_lng',
    ];

    if (hasGeo) {
      const distanceFormula = HAVERSINE_SQL('lat', 'lng', 'store.lat', 'store.lng');
      storeSelectFields.push(`${distanceFormula} AS distance`);
      storeQuery = storeQuery
        .select(storeSelectFields)
        .setParameter('lat', lat)
        .setParameter('lng', lng)
        .where('store.is_active = :isActive', { isActive: true })
        .andWhere(
          '(LOWER(store.name) LIKE :searchTerm OR LOWER(store.description) LIKE :searchTerm)',
          { searchTerm },
        )
        .andWhere(`${distanceFormula} <= :radius`, { radius })
        .orderBy('distance', 'ASC');
    } else {
      storeSelectFields.push('0 AS distance');
      storeQuery = storeQuery
        .select(storeSelectFields)
        .where('store.is_active = :isActive', { isActive: true })
        .andWhere(
          '(LOWER(store.name) LIKE :searchTerm OR LOWER(store.description) LIKE :searchTerm)',
          { searchTerm },
        )
        .orderBy('store.rating', 'DESC');
    }

    storeQuery.limit(limit);

    const rawStores: RawStoreResult[] = await storeQuery.getRawMany();

    // Get categories for stores
    const storeIds = rawStores.map(s => s.store_id);
    let categoriesMap = new Map<string, { id: string; name: string; slug: string }[]>();

    if (storeIds.length > 0) {
      const storeCategories = await this.storeRepository
        .createQueryBuilder('store')
        .innerJoin('store.categories', 'category')
        .select([
          'store.id AS store_id',
          'category.id AS category_id',
          'category.name AS category_name',
          'category.slug AS category_slug',
        ])
        .where('store.id IN (:...storeIds)', { storeIds })
        .getRawMany();

      for (const sc of storeCategories) {
        if (!categoriesMap.has(sc.store_id)) {
          categoriesMap.set(sc.store_id, []);
        }
        categoriesMap.get(sc.store_id)!.push({
          id: sc.category_id,
          name: sc.category_name,
          slug: sc.category_slug,
        });
      }
    }

    const storeResults = rawStores.map((raw) => ({
      id: raw.store_id,
      name: raw.store_name,
      description: raw.store_description,
      rating: Number(raw.store_rating),
      reviewCount: Number(raw.store_review_count),
      imageUrl: raw.store_image_url,
      location: {
        address: raw.store_address,
        city: raw.store_city,
        lat: Number(raw.store_lat),
        lng: Number(raw.store_lng),
      },
      categories: categoriesMap.get(raw.store_id) || [],
      distance: Number(raw.distance),
    }));

    return {
      products: productResults,
      stores: storeResults,
    };
  }
}
