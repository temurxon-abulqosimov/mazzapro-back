import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Align Product Schema Migration
 *
 * This migration adds missing columns to the products table to match
 * the current Product entity definition.
 *
 * Changes:
 * - Adds 'quantity' column (initialized from quantity_total)
 * - Adds 'quantity_reserved' column (default 0)
 * - Adds 'status' enum column (initialized from is_active)
 * - Adds 'expires_at' column (initialized from pickup_window_end)
 *
 * This is a backward-compatible migration that preserves existing data.
 * Old columns are NOT dropped to ensure zero-downtime deployment.
 */
export class AlignProductSchema1737600000000 implements MigrationInterface {
  name = 'AlignProductSchema1737600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create product_status_enum if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."product_status_enum" AS ENUM('DRAFT', 'ACTIVE', 'SOLD_OUT', 'EXPIRED', 'DEACTIVATED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Helper to check if column exists
    const columnExists = async (table: string, column: string): Promise<boolean> => {
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
        );
      `, [table, column]);
      return result[0]?.exists || false;
    };

    // Add 'quantity' column if it doesn't exist
    if (!(await columnExists('products', 'quantity'))) {
      console.log('Adding quantity column to products table...');
      await queryRunner.query(`
        ALTER TABLE "products" ADD COLUMN "quantity" integer;
      `);

      // Initialize from quantity_total if it exists
      if (await columnExists('products', 'quantity_total')) {
        await queryRunner.query(`
          UPDATE "products" SET "quantity" = "quantity_total" WHERE "quantity" IS NULL;
        `);
      }

      // Set NOT NULL constraint after data migration
      await queryRunner.query(`
        ALTER TABLE "products" ALTER COLUMN "quantity" SET NOT NULL;
      `);
      console.log('✅ quantity column added');
    }

    // Add 'quantity_reserved' column if it doesn't exist
    if (!(await columnExists('products', 'quantity_reserved'))) {
      console.log('Adding quantity_reserved column to products table...');
      await queryRunner.query(`
        ALTER TABLE "products" ADD COLUMN "quantity_reserved" integer NOT NULL DEFAULT 0;
      `);
      console.log('✅ quantity_reserved column added');
    }

    // Add 'status' column if it doesn't exist
    if (!(await columnExists('products', 'status'))) {
      console.log('Adding status column to products table...');
      await queryRunner.query(`
        ALTER TABLE "products" ADD COLUMN "status" "public"."product_status_enum" NOT NULL DEFAULT 'ACTIVE';
      `);

      // Initialize from is_active if it exists
      if (await columnExists('products', 'is_active')) {
        await queryRunner.query(`
          UPDATE "products" SET "status" =
            CASE
              WHEN "is_active" = true THEN 'ACTIVE'::"public"."product_status_enum"
              ELSE 'DEACTIVATED'::"public"."product_status_enum"
            END;
        `);
      }
      console.log('✅ status column added');
    }

    // Add 'expires_at' column if it doesn't exist
    if (!(await columnExists('products', 'expires_at'))) {
      console.log('Adding expires_at column to products table...');
      await queryRunner.query(`
        ALTER TABLE "products" ADD COLUMN "expires_at" TIMESTAMP WITH TIME ZONE;
      `);

      // Initialize from pickup_window_end if it exists
      if (await columnExists('products', 'pickup_window_end')) {
        await queryRunner.query(`
          UPDATE "products" SET "expires_at" = "pickup_window_end" WHERE "expires_at" IS NULL;
        `);
      }

      // Set NOT NULL constraint after data migration
      await queryRunner.query(`
        ALTER TABLE "products" ALTER COLUMN "expires_at" SET NOT NULL;
      `);
      console.log('✅ expires_at column added');
    }

    // Create indexes for new columns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_status" ON "products" ("status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_expires_at" ON "products" ("expires_at");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_store_status" ON "products" ("store_id", "status");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_status_expires" ON "products" ("status", "expires_at");
    `);

    console.log('✅ Product schema alignment complete');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration is intentionally minimal for safety
    // We only drop indexes, not columns (to preserve data)
    console.log('Rolling back product schema alignment (indexes only)...');

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_status_expires";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_store_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_expires_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_status";`);

    console.log('Note: Columns were NOT dropped to preserve data. Manual cleanup may be required.');
  }
}
