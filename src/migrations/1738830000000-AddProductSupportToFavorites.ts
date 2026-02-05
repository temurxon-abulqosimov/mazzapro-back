import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductSupportToFavorites1738830000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add type enum column (default to STORE for existing records)
    await queryRunner.query(`
      CREATE TYPE "favorites_type_enum" AS ENUM('STORE', 'PRODUCT')
    `);

    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD COLUMN "type" "favorites_type_enum" NOT NULL DEFAULT 'STORE'
    `);

    // Make store_id nullable (since product favorites won't have a store)
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ALTER COLUMN "store_id" DROP NOT NULL
    `);

    // Add product_id column
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD COLUMN "product_id" uuid
    `);

    // Add foreign key constraint for product_id
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "FK_favorites_product_id"
      FOREIGN KEY ("product_id")
      REFERENCES "products"("id")
      ON DELETE CASCADE
    `);

    // Add index on product_id
    await queryRunner.query(`
      CREATE INDEX "IDX_favorites_product_id" ON "favorites" ("product_id")
    `);

    // Add index on type
    await queryRunner.query(`
      CREATE INDEX "IDX_favorites_type" ON "favorites" ("type")
    `);

    // Add composite index for user_id and type
    await queryRunner.query(`
      CREATE INDEX "IDX_favorites_user_id_type" ON "favorites" ("user_id", "type")
    `);

    // Drop old unique constraint
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP CONSTRAINT IF EXISTS "UQ_favorites_user_id_store_id"
    `);

    // Add new unique constraint that includes product_id
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "UQ_favorites_user_store_product"
      UNIQUE ("user_id", "store_id", "product_id")
    `);

    // Add check constraint to ensure either store_id OR product_id is set (but not both or neither)
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "CHK_favorites_type_consistency"
      CHECK (
        (type = 'STORE' AND store_id IS NOT NULL AND product_id IS NULL) OR
        (type = 'PRODUCT' AND product_id IS NOT NULL AND store_id IS NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove check constraint
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP CONSTRAINT "CHK_favorites_type_consistency"
    `);

    // Remove unique constraint
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP CONSTRAINT "UQ_favorites_user_store_product"
    `);

    // Restore old unique constraint
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ADD CONSTRAINT "UQ_favorites_user_id_store_id"
      UNIQUE ("user_id", "store_id")
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_favorites_user_id_type"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_favorites_type"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_favorites_product_id"
    `);

    // Drop foreign key
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP CONSTRAINT "FK_favorites_product_id"
    `);

    // Drop product_id column
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP COLUMN "product_id"
    `);

    // Make store_id NOT NULL again
    await queryRunner.query(`
      ALTER TABLE "favorites"
      ALTER COLUMN "store_id" SET NOT NULL
    `);

    // Drop type column
    await queryRunner.query(`
      ALTER TABLE "favorites"
      DROP COLUMN "type"
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE "favorites_type_enum"
    `);
  }
}
