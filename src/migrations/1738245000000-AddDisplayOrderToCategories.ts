import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisplayOrderToCategories1738245000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add display_order column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
    `);

    // Add is_active column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    // Update existing categories with display_order based on current order
    await queryRunner.query(`
      UPDATE categories
      SET display_order = CASE
        WHEN slug = 'bakery' THEN 1
        WHEN slug = 'cafe' THEN 2
        WHEN slug = 'grocery' THEN 3
        WHEN slug = 'restaurant' THEN 4
        ELSE 999
      END
      WHERE display_order = 0 OR display_order IS NULL;
    `);

    // Ensure all categories are active by default
    await queryRunner.query(`
      UPDATE categories
      SET is_active = true
      WHERE is_active IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE categories
      DROP COLUMN IF EXISTS display_order;
    `);

    await queryRunner.query(`
      ALTER TABLE categories
      DROP COLUMN IF EXISTS is_active;
    `);
  }
}
