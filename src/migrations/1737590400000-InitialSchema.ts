import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Schema Migration
 *
 * This migration creates all tables with correctly typed columns.
 * It's safe to run on both fresh databases and existing schemas.
 *
 * For existing databases, it uses IF NOT EXISTS and safe column alterations.
 */
export class InitialSchema1737590400000 implements MigrationInterface {
  name = 'InitialSchema1737590400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types if they don't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."user_role_enum" AS ENUM('CONSUMER', 'SELLER', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."seller_status_enum" AS ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."booking_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payment_status_enum" AS ENUM('PENDING', 'CAPTURED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."notification_type_enum" AS ENUM('ORDER_CONFIRMED', 'PICKUP_READY', 'PICKUP_REMINDER', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'ORDER_EXPIRED', 'PRICE_DROP', 'NEW_OFFER', 'PROMO', 'REFERRAL', 'SELLER_APPROVED', 'SELLER_REJECTED', 'SYSTEM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."media_type_enum" AS ENUM('IMAGE', 'DOCUMENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."media_purpose_enum" AS ENUM('PRODUCT_IMAGE', 'STORE_IMAGE', 'USER_AVATAR', 'SELLER_DOCUMENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."media_status_enum" AS ENUM('PENDING', 'UPLOADED', 'PROCESSED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Check if tables exist and create them if not
    const tableExists = async (tableName: string): Promise<boolean> => {
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [tableName]);
      return result[0]?.exists || false;
    };

    // If users table doesn't exist, this is a fresh database - create all tables
    const usersExists = await tableExists('users');

    if (!usersExists) {
      // Create all tables for fresh database
      await this.createAllTables(queryRunner);
    } else {
      // Existing database - safely alter columns to correct types
      await this.alterExistingColumns(queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting schema changes is destructive - only drop if necessary
    // This is intentionally a no-op for safety
    console.log('Down migration is intentionally empty for safety. Manual intervention required to drop tables.');
  }

  private async createAllTables(queryRunner: QueryRunner): Promise<void> {
    // Markets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "markets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "code" varchar NOT NULL,
        "timezone" varchar NOT NULL DEFAULT 'UTC',
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_markets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_markets_code" UNIQUE ("code")
      );
    `);

    // Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL,
        "password_hash" varchar NOT NULL,
        "full_name" varchar NOT NULL,
        "avatar_url" text,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'CONSUMER',
        "market_id" uuid NOT NULL,
        "meals_saved" integer NOT NULL DEFAULT 0,
        "co2_saved" decimal(10,2) NOT NULL DEFAULT 0,
        "money_saved" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "email_verified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_login_at" TIMESTAMP,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
      CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
      CREATE INDEX IF NOT EXISTS "IDX_users_market_id" ON "users" ("market_id");
    `);

    // Refresh tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "device_info" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP,
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash");
    `);

    // Categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "icon" varchar,
        "sort_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_slug" UNIQUE ("slug")
      );
    `);

    // Sellers table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sellers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "status" "public"."seller_status_enum" NOT NULL DEFAULT 'PENDING_REVIEW',
        "business_name" varchar NOT NULL,
        "business_phone" varchar(50),
        "rejection_reason" text,
        "applied_at" TIMESTAMP NOT NULL,
        "approved_at" TIMESTAMP,
        "approved_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sellers" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_sellers_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_sellers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_sellers_user_id" ON "sellers" ("user_id");
    `);

    // Stores table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "seller_id" uuid NOT NULL,
        "market_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "address" varchar NOT NULL,
        "city" varchar,
        "lat" decimal(10,7) NOT NULL,
        "lng" decimal(10,7) NOT NULL,
        "image_url" text,
        "rating" decimal(2,1) NOT NULL DEFAULT 0,
        "review_count" integer NOT NULL DEFAULT 0,
        "total_products_sold" integer NOT NULL DEFAULT 0,
        "total_revenue" integer NOT NULL DEFAULT 0,
        "food_saved_kg" decimal(10,2) NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stores" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stores_seller" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_stores_seller_id" ON "stores" ("seller_id");
      CREATE INDEX IF NOT EXISTS "IDX_stores_market_id" ON "stores" ("market_id");
      CREATE INDEX IF NOT EXISTS "IDX_stores_lat_lng" ON "stores" ("lat", "lng");
      CREATE INDEX IF NOT EXISTS "IDX_stores_is_active_lat_lng" ON "stores" ("is_active", "lat", "lng");
    `);

    // Products table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "original_price" integer NOT NULL,
        "discounted_price" integer NOT NULL,
        "quantity_total" integer NOT NULL,
        "quantity_sold" integer NOT NULL DEFAULT 0,
        "pickup_window_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "pickup_window_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_products_store_id" ON "products" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_products_category_id" ON "products" ("category_id");
      CREATE INDEX IF NOT EXISTS "IDX_products_pickup_window" ON "products" ("pickup_window_start", "pickup_window_end");
    `);

    // Product images table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_images" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "url" varchar NOT NULL,
        "thumbnail_url" text,
        "position" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_images" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_images_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_product_images_product_id" ON "product_images" ("product_id");
      CREATE INDEX IF NOT EXISTS "IDX_product_images_product_position" ON "product_images" ("product_id", "position");
    `);

    // Payments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "booking_id" uuid NOT NULL,
        "amount" integer NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "status" "public"."payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "provider_tx_id" varchar(255),
        "provider_payment_method_id" varchar(255),
        "idempotency_key" varchar NOT NULL,
        "refunded_amount" integer NOT NULL DEFAULT 0,
        "refund_tx_id" varchar(255),
        "last4" varchar(4),
        "card_brand" varchar(50),
        "failure_reason" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_booking_id" UNIQUE ("booking_id"),
        CONSTRAINT "UQ_payments_idempotency_key" UNIQUE ("idempotency_key")
      );
      CREATE INDEX IF NOT EXISTS "IDX_payments_booking_id" ON "payments" ("booking_id");
      CREATE INDEX IF NOT EXISTS "IDX_payments_provider_tx_id" ON "payments" ("provider_tx_id");
      CREATE INDEX IF NOT EXISTS "IDX_payments_idempotency_key" ON "payments" ("idempotency_key");
      CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status");
    `);

    // Bookings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_number" varchar NOT NULL,
        "user_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "store_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" integer NOT NULL,
        "total_price" integer NOT NULL,
        "status" "public"."booking_status_enum" NOT NULL DEFAULT 'PENDING',
        "qr_code" text,
        "qr_code_data" varchar(255),
        "pickup_window_start" TIMESTAMP WITH TIME ZONE NOT NULL,
        "pickup_window_end" TIMESTAMP WITH TIME ZONE NOT NULL,
        "idempotency_key" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "confirmed_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "cancelled_at" TIMESTAMP,
        "cancellation_reason" text,
        CONSTRAINT "PK_bookings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_bookings_order_number" UNIQUE ("order_number"),
        CONSTRAINT "UQ_bookings_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_bookings_product" FOREIGN KEY ("product_id") REFERENCES "products"("id"),
        CONSTRAINT "FK_bookings_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_bookings_order_number" ON "bookings" ("order_number");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_user_id" ON "bookings" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_product_id" ON "bookings" ("product_id");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_store_id" ON "bookings" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_status" ON "bookings" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_user_status" ON "bookings" ("user_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_store_status" ON "bookings" ("store_id", "status");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_status_pickup" ON "bookings" ("status", "pickup_window_end");
      CREATE INDEX IF NOT EXISTS "IDX_bookings_idempotency_key" ON "bookings" ("idempotency_key");
    `);

    // Add FK from payments to bookings
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE;
    `);

    // Notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "public"."notification_type_enum" NOT NULL,
        "title" varchar NOT NULL,
        "body" text NOT NULL,
        "image_url" text,
        "data" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP,
        "push_sent" boolean NOT NULL DEFAULT false,
        "push_sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON "notifications" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_notifications_type" ON "notifications" ("type");
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_read" ON "notifications" ("user_id", "is_read");
    `);

    // Favorites table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "store_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favorites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_favorites_user_store" UNIQUE ("user_id", "store_id"),
        CONSTRAINT "FK_favorites_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_favorites_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_favorites_user_id" ON "favorites" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_favorites_store_id" ON "favorites" ("store_id");
    `);

    // Media table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "public"."media_type_enum" NOT NULL DEFAULT 'IMAGE',
        "purpose" "public"."media_purpose_enum" NOT NULL,
        "status" "public"."media_status_enum" NOT NULL DEFAULT 'PENDING',
        "original_filename" varchar NOT NULL,
        "mime_type" varchar NOT NULL,
        "file_size" integer,
        "s3_key" varchar NOT NULL,
        "s3_bucket" varchar NOT NULL,
        "url" text,
        "thumbnail_url" text,
        "width" integer,
        "height" integer,
        "processing_error" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "uploaded_at" TIMESTAMP,
        "processed_at" TIMESTAMP,
        CONSTRAINT "PK_media" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_media_user_id" ON "media" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_media_user_created" ON "media" ("user_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_media_status" ON "media" ("status");
    `);

    // Store categories junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_categories" (
        "store_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        CONSTRAINT "PK_store_categories" PRIMARY KEY ("store_id", "category_id"),
        CONSTRAINT "FK_store_categories_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_store_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE
      );
    `);

    // FCM tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fcm_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token" varchar NOT NULL,
        "device_type" varchar NOT NULL DEFAULT 'unknown',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fcm_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_fcm_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_fcm_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "IDX_fcm_tokens_user_id" ON "fcm_tokens" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_fcm_tokens_token" ON "fcm_tokens" ("token");
    `);

    // Enable uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  }

  private async alterExistingColumns(queryRunner: QueryRunner): Promise<void> {
    // Safely alter columns to correct types for existing database
    // Using ALTER COLUMN ... TYPE with USING for safe conversion

    // Users table
    await this.safeAlterColumn(queryRunner, 'users', 'avatar_url', 'text');
    await this.safeAlterColumn(queryRunner, 'users', 'last_login_at', 'timestamp');

    // Refresh tokens table
    await this.safeAlterColumn(queryRunner, 'refresh_tokens', 'device_info', 'text');
    await this.safeAlterColumn(queryRunner, 'refresh_tokens', 'last_used_at', 'timestamp');

    // Payments table
    await this.safeAlterColumn(queryRunner, 'payments', 'provider_tx_id', 'varchar(255)');
    await this.safeAlterColumn(queryRunner, 'payments', 'provider_payment_method_id', 'varchar(255)');
    await this.safeAlterColumn(queryRunner, 'payments', 'refund_tx_id', 'varchar(255)');
    await this.safeAlterColumn(queryRunner, 'payments', 'last4', 'varchar(4)');
    await this.safeAlterColumn(queryRunner, 'payments', 'card_brand', 'varchar(50)');
    await this.safeAlterColumn(queryRunner, 'payments', 'failure_reason', 'text');

    // Bookings table
    await this.safeAlterColumn(queryRunner, 'bookings', 'qr_code_data', 'varchar(255)');
    await this.safeAlterColumn(queryRunner, 'bookings', 'idempotency_key', 'varchar(255)');
    await this.safeAlterColumn(queryRunner, 'bookings', 'confirmed_at', 'timestamp');
    await this.safeAlterColumn(queryRunner, 'bookings', 'completed_at', 'timestamp');
    await this.safeAlterColumn(queryRunner, 'bookings', 'cancelled_at', 'timestamp');
    await this.safeAlterColumn(queryRunner, 'bookings', 'cancellation_reason', 'text');

    // Notifications table
    await this.safeAlterColumn(queryRunner, 'notifications', 'image_url', 'text');
    await this.safeAlterColumn(queryRunner, 'notifications', 'read_at', 'timestamp');
    await this.safeAlterColumn(queryRunner, 'notifications', 'push_sent_at', 'timestamp');

    // Product images table
    await this.safeAlterColumn(queryRunner, 'product_images', 'thumbnail_url', 'text');

    // Stores table
    await this.safeAlterColumn(queryRunner, 'stores', 'image_url', 'text');

    // Sellers table
    await this.safeAlterColumn(queryRunner, 'sellers', 'business_phone', 'varchar(50)');
    await this.safeAlterColumn(queryRunner, 'sellers', 'rejection_reason', 'text');
    await this.safeAlterColumn(queryRunner, 'sellers', 'approved_at', 'timestamp');
    await this.safeAlterColumn(queryRunner, 'sellers', 'approved_by', 'uuid');

    // Media table
    await this.safeAlterColumn(queryRunner, 'media', 'url', 'text');
    await this.safeAlterColumn(queryRunner, 'media', 'thumbnail_url', 'text');
    await this.safeAlterColumn(queryRunner, 'media', 'processing_error', 'text');
    await this.safeAlterColumn(queryRunner, 'media', 'uploaded_at', 'timestamp');
    await this.safeAlterColumn(queryRunner, 'media', 'processed_at', 'timestamp');
  }

  private async safeAlterColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    newType: string,
  ): Promise<void> {
    try {
      // Check if column exists
      const columnExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
        );
      `, [table, column]);

      if (!columnExists[0]?.exists) {
        return; // Column doesn't exist, skip
      }

      // Alter column type with USING for safe conversion
      await queryRunner.query(`
        ALTER TABLE "${table}"
        ALTER COLUMN "${column}" TYPE ${newType}
        USING "${column}"::${newType};
      `);
    } catch (error) {
      // Log but don't fail - column might already be correct type
      console.log(`Note: Could not alter ${table}.${column} to ${newType}: ${error.message}`);
    }
  }
}
