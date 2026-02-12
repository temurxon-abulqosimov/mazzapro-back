import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { DataSource } from 'typeorm';

@ApiTags('Admin')
@Controller('admin/seed')
export class AdminSeedController {
  constructor(private readonly dataSource: DataSource) { }

  @Post('mock-data')
  @Public() // IMPORTANT: Remove this in production or add proper auth!
  @ApiOperation({ summary: 'Seed mock data for testing' })
  @ApiResponse({ status: 201, description: 'Mock data created' })
  async seedMockData(): Promise<{ message: string; summary: string }> {
    const marketId = '550e8400-e29b-41d4-a716-446655440000'; // NYC market
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    // 1. Create Categories with proper public image URLs
    const categories = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Bakery',
        slug: 'bakery',
        icon: `${baseUrl}/categories/bakery.jpg`,
        displayOrder: 1,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Desserts',
        slug: 'desserts',
        icon: `${baseUrl}/categories/desserts.jpg`,
        displayOrder: 2,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Fast Food',
        slug: 'fast-food',
        icon: `${baseUrl}/categories/fast-food.jpg`,
        displayOrder: 3,
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        name: 'Traditional',
        slug: 'traditional',
        icon: `${baseUrl}/categories/traditional.jpg`,
        displayOrder: 4,
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        name: 'Salads & Healthy',
        slug: 'salad',
        icon: `${baseUrl}/categories/salad.jpg`,
        displayOrder: 5,
      },
    ];

    for (const cat of categories) {
      await this.dataSource.query(
        `
        INSERT INTO categories (id, name, slug, icon, display_order, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        ON CONFLICT (slug) DO NOTHING
      `,
        [cat.id, cat.name, cat.slug, cat.icon, cat.displayOrder],
      );
    }

    // 2. Create Seller Users
    const sellers = [
      {
        id: '00000001-0000-0000-0000-000000000001',
        email: 'seller1@bakery.com',
        fullName: 'Fresh Bakery Owner',
        password:
          '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.PRm0t8D0GwBEe0Ci1jKZ9E6k8WNXGK', // "Password123"
      },
      {
        id: '00000002-0000-0000-0000-000000000002',
        email: 'seller2@cafe.com',
        fullName: 'Cozy Cafe Owner',
        password:
          '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.PRm0t8D0GwBEe0Ci1jKZ9E6k8WNXGK',
      },
      {
        id: '00000003-0000-0000-0000-000000000003',
        email: 'seller3@grocery.com',
        fullName: 'Green Grocery Owner',
        password:
          '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.PRm0t8D0GwBEe0Ci1jKZ9E6k8WNXGK',
      },
    ];

    for (const seller of sellers) {
      // Create user
      await this.dataSource.query(
        `
        INSERT INTO users (id, email, full_name, password_hash, role, market_id, created_at)
        VALUES ($1, $2, $3, $4, 'SELLER', $5, NOW())
        ON CONFLICT (email) DO NOTHING
      `,
        [seller.id, seller.email, seller.fullName, seller.password, marketId],
      );

      // Create seller profile
      await this.dataSource.query(
        `
        INSERT INTO sellers (id, user_id, business_name, business_address, is_verified, created_at, updated_at)
        VALUES ($1, $1, $2, 'Business Address', true, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `,
        [seller.id, seller.fullName],
      );
    }

    // 3. Create Stores
    const stores = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        sellerId: sellers[0].id,
        name: 'Fresh Daily Bakery',
        description: 'Artisan breads and pastries baked fresh daily',
        address: '123 Broadway, New York, NY 10007',
        city: 'New York',
        lat: 40.7128,
        lng: -74.006,
        imageUrl: `${baseUrl}/categories/bakery.jpg`,
        rating: 4.5,
        categoryId: categories[0].id,
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        sellerId: sellers[1].id,
        name: 'Cozy Corner Cafe',
        description: 'Your neighborhood cafe with fresh coffee and sandwiches',
        address: '456 5th Avenue, New York, NY 10018',
        city: 'New York',
        lat: 40.758,
        lng: -73.9855,
        imageUrl: `${baseUrl}/categories/desserts.jpg`,
        rating: 4.7,
        categoryId: categories[1].id,
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        sellerId: sellers[2].id,
        name: 'Green Market Grocery',
        description: 'Organic produce and local goods',
        address: '789 Madison Ave, New York, NY 10065',
        city: 'New York',
        lat: 40.7689,
        lng: -73.9658,
        imageUrl: `${baseUrl}/categories/traditional.jpg`,
        rating: 4.3,
        categoryId: categories[3].id, // Traditional (as placeholder)
      },
    ];

    for (const store of stores) {
      await this.dataSource.query(
        `
        INSERT INTO stores (
          id, seller_id, market_id, name, description, address, city,
          lat, lng, image_url, rating, review_count, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, true, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `,
        [
          store.id,
          store.sellerId,
          marketId,
          store.name,
          store.description,
          store.address,
          store.city,
          store.lat,
          store.lng,
          store.imageUrl,
          store.rating,
        ],
      );

      // Link store to category
      await this.dataSource.query(
        `
        INSERT INTO store_categories (store_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
        [store.id, store.categoryId],
      );
    }

    // 4. Create Products
    const now = new Date();
    const pickupStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const pickupEnd = new Date(now.getTime() + 5 * 60 * 60 * 1000); // 5 hours from now
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    const products = [
      // Bakery Products
      {
        id: 'prod-0001-0000-0000-000000000001',
        storeId: stores[0].id,
        categoryId: categories[0].id,
        name: 'Surprise Bakery Bag',
        description: 'Assorted fresh pastries and breads from today',
        originalPrice: 1500,
        discountedPrice: 500,
        quantity: 10,
        images: [
          {
            url: `${baseUrl}/categories/bakery.jpg`,
            thumbnailUrl: `${baseUrl}/categories/bakery.jpg`,
          },
        ],
      },
      {
        id: 'prod-0002-0000-0000-000000000002',
        storeId: stores[0].id,
        categoryId: categories[0].id,
        name: 'Fresh Croissant Box',
        description: '6 butter croissants, perfectly flaky',
        originalPrice: 1200,
        discountedPrice: 400,
        quantity: 5,
        images: [
          {
            url: `${baseUrl}/categories/bakery.jpg`,
            thumbnailUrl: `${baseUrl}/categories/bakery.jpg`,
          },
        ],
      },
      {
        id: 'prod-0003-0000-0000-000000000003',
        storeId: stores[0].id,
        categoryId: categories[0].id,
        name: 'Artisan Bread Bundle',
        description: 'Sourdough and whole wheat loaves',
        originalPrice: 1800,
        discountedPrice: 600,
        quantity: 8,
        images: [
          {
            url: `${baseUrl}/categories/bakery.jpg`,
            thumbnailUrl: `${baseUrl}/categories/bakery.jpg`,
          },
        ],
      },
      // Cafe Products
      {
        id: 'prod-0004-0000-0000-000000000004',
        storeId: stores[1].id,
        categoryId: categories[1].id,
        name: 'Cafe Meal Deal',
        description: 'Sandwich, side, and drink combo',
        originalPrice: 1400,
        discountedPrice: 500,
        quantity: 15,
        images: [
          {
            url: `${baseUrl}/categories/desserts.jpg`,
            thumbnailUrl: `${baseUrl}/categories/desserts.jpg`,
          },
        ],
      },
      {
        id: 'prod-0005-0000-0000-000000000005',
        storeId: stores[1].id,
        categoryId: categories[1].id,
        name: 'Pastry & Coffee Set',
        description: 'Any pastry with hot coffee',
        originalPrice: 900,
        discountedPrice: 350,
        quantity: 12,
        images: [
          {
            url: `${baseUrl}/categories/desserts.jpg`,
            thumbnailUrl: `${baseUrl}/categories/desserts.jpg`,
          },
        ],
      },
      // Grocery Products -> Salad (using Salad category)
      {
        id: 'prod-0006-0000-0000-000000000006',
        storeId: stores[2].id,
        categoryId: categories[4].id, // Salad
        name: 'Fresh Garden Salad',
        description: 'Mixed seasonal vegetables',
        originalPrice: 2500,
        discountedPrice: 800,
        quantity: 7,
        images: [
          {
            url: `${baseUrl}/categories/salad.jpg`,
            thumbnailUrl: `${baseUrl}/categories/salad.jpg`,
          },
        ],
      },
      {
        id: 'prod-0007-0000-0000-000000000007',
        storeId: stores[2].id,
        categoryId: categories[4].id, // Salad
        name: 'Caesar Salad',
        description: 'Classic Caesar with croutons',
        originalPrice: 1000,
        discountedPrice: 400,
        quantity: 10,
        images: [
          {
            url: `${baseUrl}/categories/salad.jpg`,
            thumbnailUrl: `${baseUrl}/categories/salad.jpg`,
          },
        ],
      },
    ];

    for (const product of products) {
      // Insert product
      await this.dataSource.query(
        `
        INSERT INTO products (
          id, store_id, category_id, name, description,
          original_price, discounted_price, quantity, quantity_reserved,
          pickup_window_start, pickup_window_end, status, expires_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, 'ACTIVE', $11, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `,
        [
          product.id,
          product.storeId,
          product.categoryId,
          product.name,
          product.description,
          product.originalPrice,
          product.discountedPrice,
          product.quantity,
          pickupStart,
          pickupEnd,
          expiresAt,
        ],
      );

      // Insert product images
      for (let i = 0; i < product.images.length; i++) {
        await this.dataSource.query(
          `
          INSERT INTO product_images (
            id, product_id, url, thumbnail_url, display_order, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NOW()
          )
          ON CONFLICT DO NOTHING
        `,
          [
            product.id,
            product.images[i].url,
            product.images[i].thumbnailUrl,
            i,
          ],
        );
      }
    }

    return {
      message: 'Mock data created successfully',
      summary:
        '4 categories, 3 sellers, 3 stores, and 7 products with images created',
    };
  }

  @Post('fix-stores')
  @Public()
  @ApiOperation({ summary: 'Fix store locations and activation' })
  async fixStores(): Promise<any> {
    // 1. Activate all inactive stores
    const activated = await this.dataSource.query(
      `UPDATE stores SET is_active = true, updated_at = NOW() WHERE is_active = false`
    );

    // 2. Move San Francisco stores to Tashkent
    const moved = await this.dataSource.query(
      `UPDATE stores SET lat = 41.2995, lng = 69.2401, city = 'Tashkent', address = 'Yunusobod, Toshkent', updated_at = NOW() WHERE city = 'San Francisco'`
    );

    // 3. Refresh expired products
    const refreshed = await this.dataSource.query(
      `UPDATE products SET expires_at = NOW() + INTERVAL '30 days', pickup_window_start = NOW() + INTERVAL '2 hours', pickup_window_end = NOW() + INTERVAL '5 hours', status = 'ACTIVE', updated_at = NOW() WHERE expires_at < NOW() OR status != 'ACTIVE'`
    );

    // 4. Verify
    const stores = await this.dataSource.query(
      `SELECT name, city, lat, lng, is_active, (SELECT COUNT(*) FROM products p WHERE p.store_id = stores.id AND p.status = 'ACTIVE' AND p.expires_at > NOW()) as active_products FROM stores`
    );

    return { message: 'Stores fixed', activated, moved, refreshed, stores };
  }
}
