import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSellersTable1738246000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column if it doesn't exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_status_enum') THEN
          CREATE TYPE seller_status_enum AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS status seller_status_enum DEFAULT 'PENDING_REVIEW';
    `);

    // Add business_phone column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);
    `);

    // Add rejection_reason column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    // Add applied_at column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP DEFAULT NOW();
    `);

    // Add approved_at column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
    `);

    // Add approved_by column if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS approved_by UUID;
    `);

    // Update existing sellers to have correct values
    await queryRunner.query(`
      UPDATE sellers
      SET
        status = COALESCE(status, 'PENDING_REVIEW'::seller_status_enum),
        applied_at = COALESCE(applied_at, created_at)
      WHERE status IS NULL OR applied_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sellers
      DROP COLUMN IF EXISTS approved_by;
    `);

    await queryRunner.query(`
      ALTER TABLE sellers
      DROP COLUMN IF EXISTS approved_at;
    `);

    await queryRunner.query(`
      ALTER TABLE sellers
      DROP COLUMN IF EXISTS applied_at;
    `);

    await queryRunner.query(`
      ALTER TABLE sellers
      DROP COLUMN IF EXISTS rejection_reason;
    `);

    await queryRunner.query(`
      ALTER TABLE sellers
      DROP COLUMN IF EXISTS business_phone;
    `);

    await queryRunner.query(`
      ALTER TABLE sellers
      DROP COLUMN IF EXISTS status;
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS seller_status_enum;
    `);
  }
}
