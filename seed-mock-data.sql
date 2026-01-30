-- Seed Mock Data for MAZZA
-- Run this SQL script directly on your Railway PostgreSQL database

-- Set variables
\set marketId '550e8400-e29b-41d4-a716-446655440000'

-- 1. Create Categories
INSERT INTO categories (id, name, slug, icon, display_order, is_active, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Bakery', 'bakery', '🥖', 1, true, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Cafe', 'cafe', '☕', 2, true, NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Grocery', 'grocery', '🛒', 3, true, NOW()),
  ('44444444-4444-4444-4444-444444444444', 'Restaurant', 'restaurant', '🍽️', 4, true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- 2. Create Seller Users
INSERT INTO users (id, email, full_name, password_hash, role, market_id, created_at)
VALUES
  ('00000001-0000-0000-0000-000000000001', 'seller1@bakery.com', 'Fresh Bakery Owner',
   '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.PRm0t8D0GwBEe0Ci1jKZ9E6k8WNXGK', 'SELLER', '550e8400-e29b-41d4-a716-446655440000', NOW()),
  ('00000002-0000-0000-0000-000000000002', 'seller2@cafe.com', 'Cozy Cafe Owner',
   '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.PRm0t8D0GwBEe0Ci1jKZ9E6k8WNXGK', 'SELLER', '550e8400-e29b-41d4-a716-446655440000', NOW()),
  ('00000003-0000-0000-0000-000000000003', 'seller3@grocery.com', 'Green Grocery Owner',
   '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.PRm0t8D0GwBEe0Ci1jKZ9E6k8WNXGK', 'SELLER', '550e8400-e29b-41d4-a716-446655440000', NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. Create Seller Profiles
INSERT INTO sellers (id, user_id, business_name, business_address, is_verified, created_at, updated_at)
VALUES
  ('00000001-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'Fresh Bakery Owner', 'Business Address', true, NOW(), NOW()),
  ('00000002-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000002', 'Cozy Cafe Owner', 'Business Address', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000003', 'Green Grocery Owner', 'Business Address', true, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create Stores
INSERT INTO stores (
  id, seller_id, market_id, name, description, address, city,
  lat, lng, image_url, rating, review_count, is_active, created_at, updated_at
) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000001-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440000',
   'Fresh Daily Bakery', 'Artisan breads and pastries baked fresh daily', '123 Broadway, New York, NY 10007', 'New York',
   40.7128, -74.0060, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 4.5, 0, true, NOW(), NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000002-0000-0000-0000-000000000002', '550e8400-e29b-41d4-a716-446655440000',
   'Cozy Corner Cafe', 'Your neighborhood cafe with fresh coffee and sandwiches', '456 5th Avenue, New York, NY 10018', 'New York',
   40.7580, -73.9855, 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', 4.7, 0, true, NOW(), NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000003-0000-0000-0000-000000000003', '550e8400-e29b-41d4-a716-446655440000',
   'Green Market Grocery', 'Organic produce and local goods', '789 Madison Ave, New York, NY 10065', 'New York',
   40.7689, -73.9658, 'https://images.unsplash.com/photo-1543083115-638c32cd3d58?w=800', 4.3, 0, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Link Stores to Categories
INSERT INTO store_categories (store_id, category_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- 6. Create Products (Pickup window: 2-5 hours from now, Expires: 24 hours from now)
INSERT INTO products (
  id, store_id, category_id, name, description,
  original_price, discounted_price, quantity, quantity_reserved,
  pickup_window_start, pickup_window_end, status, expires_at,
  created_at, updated_at
) VALUES
  -- Bakery Products
  ('prod-0001-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'Surprise Bakery Bag', 'Assorted fresh pastries and breads from today',
   1500, 500, 10, 0, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 'ACTIVE', NOW() + INTERVAL '24 hours', NOW(), NOW()),

  ('prod-0002-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'Fresh Croissant Box', '6 butter croissants, perfectly flaky',
   1200, 400, 5, 0, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 'ACTIVE', NOW() + INTERVAL '24 hours', NOW(), NOW()),

  ('prod-0003-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'Artisan Bread Bundle', 'Sourdough and whole wheat loaves',
   1800, 600, 8, 0, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 'ACTIVE', NOW() + INTERVAL '24 hours', NOW(), NOW()),

  -- Cafe Products
  ('prod-0004-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
   'Cafe Meal Deal', 'Sandwich, side, and drink combo',
   1400, 500, 15, 0, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 'ACTIVE', NOW() + INTERVAL '24 hours', NOW(), NOW()),

  ('prod-0005-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222',
   'Pastry & Coffee Set', 'Any pastry with hot coffee',
   900, 350, 12, 0, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 'ACTIVE', NOW() + INTERVAL '24 hours', NOW(), NOW()),

  -- Grocery Products
  ('prod-0006-0000-0000-000000000006', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333',
   'Fresh Produce Box', 'Mixed seasonal vegetables and fruits',
   2500, 800, 7, 0, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 'ACTIVE', NOW() + INTERVAL '24 hours', NOW(), NOW()),

  ('prod-0007-0000-0000-000000000007', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333',
   'Organic Salad Kit', 'Pre-washed greens with dressing',
   1000, 400, 10, 0, NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 'ACTIVE', NOW() + INTERVAL '24 hours', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. Create Product Images
INSERT INTO product_images (id, product_id, url, thumbnail_url, display_order, created_at) VALUES
  (gen_random_uuid(), 'prod-0001-0000-0000-000000000001', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300', 0, NOW()),
  (gen_random_uuid(), 'prod-0002-0000-0000-000000000002', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300', 0, NOW()),
  (gen_random_uuid(), 'prod-0003-0000-0000-000000000003', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300', 0, NOW()),
  (gen_random_uuid(), 'prod-0004-0000-0000-000000000004', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=300', 0, NOW()),
  (gen_random_uuid(), 'prod-0005-0000-0000-000000000005', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300', 0, NOW()),
  (gen_random_uuid(), 'prod-0006-0000-0000-000000000006', 'https://images.unsplash.com/photo-1543083115-638c32cd3d58?w=800', 'https://images.unsplash.com/photo-1543083115-638c32cd3d58?w=300', 0, NOW()),
  (gen_random_uuid(), 'prod-0007-0000-0000-000000000007', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300', 0, NOW())
ON CONFLICT DO NOTHING;

-- Summary
SELECT 'Mock data seeding completed!' as message;
SELECT 'Created:' as summary, '4 categories, 3 sellers, 3 stores, 7 products' as details;
