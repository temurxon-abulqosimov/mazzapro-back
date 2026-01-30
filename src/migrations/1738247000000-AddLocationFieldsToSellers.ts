import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationFieldsToSellers1738247000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS address VARCHAR(255),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS lng DECIMAL(10, 7);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sellers
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS address,
      DROP COLUMN IF EXISTS city,
      DROP COLUMN IF EXISTS lat,
      DROP COLUMN IF EXISTS lng;
    `);
  }
}
