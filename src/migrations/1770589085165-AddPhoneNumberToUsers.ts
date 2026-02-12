import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneNumberToUsers1770589085165 implements MigrationInterface {
    name = 'AddPhoneNumberToUsers1770589085165';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add phone_number column
        await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" VARCHAR UNIQUE
        `);

        // Add phone_verified column
        await queryRunner.query(`
            ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified" BOOLEAN DEFAULT false
        `);

        // Make email nullable (was required before)
        await queryRunner.query(`
            ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL
        `);

        // Update auth_provider default from 'email' to 'phone'
        await queryRunner.query(`
            ALTER TABLE "users" ALTER COLUMN "auth_provider" SET DEFAULT 'phone'
        `);

        // Create index on phone_number
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_users_phone_number" ON "users" ("phone_number")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_phone_number"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "auth_provider" SET DEFAULT 'email'`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_verified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_number"`);
    }
}
