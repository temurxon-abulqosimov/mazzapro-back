-- Migration: Add Follow and NotificationPreference tables

-- 1. Create follows table
CREATE TABLE "follows" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL,
    "store_id" uuid NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_feed123456789" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_follow_user_store" UNIQUE ("user_id", "store_id")
);

-- Add Indices for performance
CREATE INDEX "IDX_follow_user" ON "follows" ("user_id");
CREATE INDEX "IDX_follow_store" ON "follows" ("store_id");

-- 2. Create notification_preferences table
CREATE TABLE "notification_preferences" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" uuid NOT NULL,
    "new_product_alerts" boolean NOT NULL DEFAULT true,
    "order_updates" boolean NOT NULL DEFAULT true,
    "promotional_emails" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_pref123456789" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_pref_user" UNIQUE ("user_id") -- Ensure one preference per user
);

-- 3. Add Foreign Keys

-- Follow -> User
ALTER TABLE "follows" 
ADD CONSTRAINT "FK_follow_user" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Follow -> Store
ALTER TABLE "follows" 
ADD CONSTRAINT "FK_follow_store" 
FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- NotificationPreference -> User
ALTER TABLE "notification_preferences" 
ADD CONSTRAINT "FK_pref_user" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
