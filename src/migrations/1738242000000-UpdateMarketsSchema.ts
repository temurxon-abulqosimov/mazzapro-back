import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMarketsSchema1738242000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename 'code' column to 'slug'
    await queryRunner.query(`
      ALTER TABLE "markets" RENAME COLUMN "code" TO "slug";
    `);

    // Add missing columns
    await queryRunner.query(`
      ALTER TABLE "markets"
      ADD COLUMN "currency_symbol" varchar(5) NOT NULL DEFAULT '$',
      ADD COLUMN "center_lat" decimal(10,7),
      ADD COLUMN "center_lng" decimal(10,7),
      ADD COLUMN "default_radius_km" decimal(5,2) NOT NULL DEFAULT 10.00,
      ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT now();
    `);

    // Update the unique constraint name
    await queryRunner.query(`
      ALTER TABLE "markets" RENAME CONSTRAINT "UQ_markets_code" TO "UQ_markets_slug";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop added columns
    await queryRunner.query(`
      ALTER TABLE "markets"
      DROP COLUMN "updated_at",
      DROP COLUMN "default_radius_km",
      DROP COLUMN "center_lng",
      DROP COLUMN "center_lat",
      DROP COLUMN "currency_symbol";
    `);

    // Rename constraint back
    await queryRunner.query(`
      ALTER TABLE "markets" RENAME CONSTRAINT "UQ_markets_slug" TO "UQ_markets_code";
    `);

    // Rename 'slug' column back to 'code'
    await queryRunner.query(`
      ALTER TABLE "markets" RENAME COLUMN "slug" TO "code";
    `);
  }
}
