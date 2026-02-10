-- Booking, Review, and Payment Schema Migration

-- 1. Create Bookings Table
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "order_number" character varying NOT NULL,
    "user_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "store_id" uuid NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" integer NOT NULL,
    "total_price" integer NOT NULL,
    "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'PENDING',
    "qr_code" text,
    "qr_code_data" character varying(255),
    "pickup_window_start" TIMESTAMP WITH TIME ZONE NOT NULL,
    "pickup_window_end" TIMESTAMP WITH TIME ZONE NOT NULL,
    "idempotency_key" character varying(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    "confirmed_at" TIMESTAMP,
    "completed_at" TIMESTAMP,
    "cancelled_at" TIMESTAMP,
    "cancellation_reason" text,
    CONSTRAINT "UQ_bookings_order_number" UNIQUE ("order_number"),
    CONSTRAINT "UQ_bookings_idempotency_key" UNIQUE ("idempotency_key"),
    CONSTRAINT "PK_bookings" PRIMARY KEY ("id")
);

-- Indices for Bookings
CREATE INDEX IF NOT EXISTS "IDX_bookings_user_status" ON "bookings" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "IDX_bookings_store_status" ON "bookings" ("store_id", "status");
CREATE INDEX IF NOT EXISTS "IDX_bookings_status_pickup" ON "bookings" ("status", "pickup_window_end");

-- 2. Create Reviews Table
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "rating" integer NOT NULL,
    "comment" text,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "booking_id" uuid NOT NULL,
    "reviewer_id" uuid NOT NULL,
    "store_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    CONSTRAINT "UQ_reviews_booking_id" UNIQUE ("booking_id"),
    CONSTRAINT "PK_reviews" PRIMARY KEY ("id")
);

-- Indices for Reviews
CREATE INDEX IF NOT EXISTS "IDX_reviews_store_id" ON "reviews" ("store_id");
CREATE INDEX IF NOT EXISTS "IDX_reviews_product_id" ON "reviews" ("product_id");

-- 3. Create Payments Table
CREATE TABLE IF NOT EXISTS "payments" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "booking_id" uuid NOT NULL,
    "amount" integer NOT NULL,
    "currency" character varying(3) NOT NULL DEFAULT 'USD',
    "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING',
    "provider_tx_id" character varying(255),
    "provider_payment_method_id" character varying(255),
    "idempotency_key" character varying NOT NULL,
    "refunded_amount" integer NOT NULL DEFAULT 0,
    "refund_tx_id" character varying(255),
    "last4" character varying(4),
    "card_brand" character varying(50),
    "failure_reason" text,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_payments_booking_id" UNIQUE ("booking_id"),
    CONSTRAINT "UQ_payments_idempotency_key" UNIQUE ("idempotency_key"),
    CONSTRAINT "PK_payments" PRIMARY KEY ("id")
);

-- Indices for Payments
CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status");

-- 4. Add Enum Types (if they don't exist)
DO $$ BEGIN
    CREATE TYPE "public"."bookings_status_enum" AS ENUM ('PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."payments_status_enum" AS ENUM ('PENDING', 'CAPTURED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Foreign Key Constraints
ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_user" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_store" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "reviews" ADD CONSTRAINT "FK_reviews_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
