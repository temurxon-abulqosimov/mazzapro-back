import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsOpenToStores1738728000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stores
      ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;
    `);

    // Update existing records to have is_open set to true
    await queryRunner.query(`
      UPDATE stores
      SET is_open = true
      WHERE is_open IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stores
      DROP COLUMN IF EXISTS is_open;
    `);
  }
}
