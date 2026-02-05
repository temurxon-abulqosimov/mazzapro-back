import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixFavoritesConstraints1738930000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old unique constraint that was not dropped by previous migration
    // (previous migration tried to drop "UQ_favorites_user_id_store_id" but actual name is "UQ_favorites_user_store")
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP CONSTRAINT IF EXISTS "UQ_favorites_user_store"
    `);

    // Also drop the composite unique constraint that doesn't work with NULLs
    // PostgreSQL treats NULLs as distinct in unique constraints, making it useless
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP CONSTRAINT IF EXISTS "UQ_favorites_user_store_product"
    `);

    // Create proper partial unique indexes that correctly handle NULL columns
    // For store favorites: enforce one favorite per user per store
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_favorites_user_store"
      ON "favorites" ("user_id", "store_id")
      WHERE "type" = 'STORE'
    `);

    // For product favorites: enforce one favorite per user per product
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_favorites_user_product"
      ON "favorites" ("user_id", "product_id")
      WHERE "type" = 'PRODUCT'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop partial unique indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_favorites_user_product"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_favorites_user_store"
    `);

    // Restore the composite unique constraint
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "UQ_favorites_user_store_product"
      UNIQUE ("user_id", "store_id", "product_id")
    `);
  }
}
