import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleAuthFields1770389085165 implements MigrationInterface {
    name = 'AddGoogleAuthFields1770389085165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add google_id column
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "google_id" VARCHAR(255) UNIQUE
        `);

        // Add auth_provider column with default 'email'
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'email'
        `);

        // Make password_hash nullable for OAuth users
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "password_hash" DROP NOT NULL
        `);

        // Create index on google_id for faster lookups
        await queryRunner.query(`CREATE INDEX "IDX_users_google_id" ON "users" ("google_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX "IDX_users_google_id"`);

        // Make password_hash required again (may fail if there are OAuth users)
        await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "password_hash" SET NOT NULL
        `);

        // Drop columns
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_provider"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_id"`);
    }
}
