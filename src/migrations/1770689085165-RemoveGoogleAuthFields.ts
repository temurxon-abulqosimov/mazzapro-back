import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveGoogleAuthFields1770689085165 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop google_id index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_google_id"`);

    // Drop google_id column
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id"`);

    // Update auth_provider: change any 'google' values to 'phone'
    await queryRunner.query(`UPDATE "users" SET "auth_provider" = 'phone' WHERE "auth_provider" = 'google'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add google_id column
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "google_id" varchar UNIQUE`);

    // Re-create index
    await queryRunner.query(`CREATE INDEX "IDX_users_google_id" ON "users" ("google_id")`);
  }
}
