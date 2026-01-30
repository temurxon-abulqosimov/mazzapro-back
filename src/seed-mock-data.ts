import { AppDataSource } from './data-source';

async function seedMockData() {
  console.log('=== Seeding Mock Data ===');

  try {
    // Initialize connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connection established');
    }

    const marketId = '550e8400-e29b-41d4-a716-446655440000'; // NYC market

    // 1. Create Categories
    console.log('Creating categories...');
    const categories = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Bakery', slug: 'bakery', icon: '🥖', displayOrder: 1 },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Cafe', slug: 'cafe', icon: '☕', displayOrder: 2 },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Grocery', slug: 'grocery', icon: '🛒', displayOrder: 3 },
      { id: '44444444-4444-4444-4444-444444444444', name: 'Restaurant', slug: 'restaurant', icon: '🍽️', displayOrder: 4 },
    ];

    for (const cat of categories) {
      await AppDataSource.query(`
        INSERT INTO categories (id, name, slug, icon, display_order, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        ON CONFLICT (slug) DO NOTHING
      `, [cat.id, cat.name, cat.slug, cat.icon, cat.displayOrder]);
    }
    console.log('✅ Categories created');

    // 2. Create Seller Users
    console.log('Creating sellers...');
    const sellers = [
      {
        id: '00000001-0000-0000-0000-000000000001',
        email: 'seller1@bakery.com',
        fullName: 'Fresh Bakery Owner',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456' // Hashed password (not real)
      },
      {
        id: '00000002-0000-0000-0000-000000000002',
        email: 'seller2@cafe.com',
        fullName: 'Cozy Cafe Owner',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456'
      },
      {
        id: '00000003-0000-0000-0000-000000000003',
        email: 'seller3@grocery.com',
        fullName: 'Green Grocery Owner',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456'
      },
    ];

    for (const seller of sellers) {
      // Create user
      await AppDataSource.query(`
        INSERT INTO users (id, email, full_name, password_hash, role, market_id, created_at)
        VALUES ($1, $2, $3, $4, 'SELLER', $5, NOW())
        ON CONFLICT (email) DO NOTHING
      `, [seller.id, seller.email, seller.fullName, seller.password, marketId]);

      // Create seller profile
      await AppDataSource.query(`
        INSERT INTO sellers (id, user_id, business_name, business_address, is_verified, created_at, updated_at)
        VALUES ($1, $1, $2, 'Business Address', true, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [seller.id, seller.fullName]);
    }
    console.log('✅ Sellers created');

    // 3. Create Stores
    console.log('Creating stores...');
    const stores = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        sellerId: sellers[0].id,
        name: 'Fresh Daily Bakery',
        description: 'Artisan breads and pastries baked fresh daily',
        address: '123 Broadway, New York, NY 10007',
        city: 'New York',
        lat: 40.7128,
        lng: -74.0060,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
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
        lat: 40.7580,
        lng: -73.9855,
        imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
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
        imageUrl: 'https://images.unsplash.com/photo-1543083115-638c32cd3d58?w=800',
        rating: 4.3,
        categoryId: categories[2].id,
      },
    ];

    for (const store of stores) {
      await AppDataSource.query(`
        INSERT INTO stores (
          id, seller_id, market_id, name, description, address, city,
          lat, lng, image_url, rating, review_count, is_active,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, true, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        store.id, store.sellerId, marketId, store.name, store.description,
        store.address, store.city, store.lat, store.lng, store.imageUrl, store.rating
      ]);

      // Link store to category
      await AppDataSource.query(`
        INSERT INTO store_categories (store_id, category_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [store.id, store.categoryId]);
    }
    console.log('✅ Stores created');

    // 4. Create Products
    console.log('Creating products...');
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
        originalPrice: 1500, // $15.00
        discountedPrice: 500, // $5.00
        quantity: 10,
        images: [
          { url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300' },
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
          { url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300' },
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
          { url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300' },
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
          { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300' },
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
          { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300' },
        ],
      },
      // Grocery Products
      {
        id: 'prod-0006-0000-0000-000000000006',
        storeId: stores[2].id,
        categoryId: categories[2].id,
        name: 'Fresh Produce Box',
        description: 'Mixed seasonal vegetables and fruits',
        originalPrice: 2500,
        discountedPrice: 800,
        quantity: 7,
        images: [
          { url: 'https://images.unsplash.com/photo-1543083115-638c32cd3d58?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1543083115-638c32cd3d58?w=300' },
        ],
      },
      {
        id: 'prod-0007-0000-0000-000000000007',
        storeId: stores[2].id,
        categoryId: categories[2].id,
        name: 'Organic Salad Kit',
        description: 'Pre-washed greens with dressing',
        originalPrice: 1000,
        discountedPrice: 400,
        quantity: 10,
        images: [
          { url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', thumbnailUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300' },
        ],
      },
    ];

    for (const product of products) {
      // Insert product
      await AppDataSource.query(`
        INSERT INTO products (
          id, store_id, category_id, name, description,
          original_price, discounted_price, quantity, quantity_reserved,
          pickup_window_start, pickup_window_end, status, expires_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, 'ACTIVE', $11, NOW(), NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        product.id, product.storeId, product.categoryId, product.name,
        product.description, product.originalPrice, product.discountedPrice,
        product.quantity, pickupStart, pickupEnd, expiresAt
      ]);

      // Insert product images
      for (let i = 0; i < product.images.length; i++) {
        await AppDataSource.query(`
          INSERT INTO product_images (
            id, product_id, url, thumbnail_url, display_order, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, NOW()
          )
          ON CONFLICT DO NOTHING
        `, [product.id, product.images[i].url, product.images[i].thumbnailUrl, i]);
      }
    }
    console.log('✅ Products created');

    await AppDataSource.destroy();
    console.log('✅ Mock data seeding completed successfully!');
    console.log('\nCreated:');
    console.log('- 4 categories (Bakery, Cafe, Grocery, Restaurant)');
    console.log('- 3 sellers');
    console.log('- 3 stores');
    console.log('- 7 products with images');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

// Run the seed
seedMockData().then(() => {
  console.log('Done!');
  process.exit(0);
});
