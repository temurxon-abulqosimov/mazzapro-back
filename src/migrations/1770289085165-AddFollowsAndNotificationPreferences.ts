import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFollowsAndNotificationPreferences1770289085165 implements MigrationInterface {
    name = 'AddFollowsAndNotificationPreferences1770289085165'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create follows table
        await queryRunner.query(`
            CREATE TABLE "follows" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "store_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_follows_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_follow_user_store" UNIQUE ("user_id", "store_id")
            )
        `);

        // Add Indices for performance
        await queryRunner.query(`CREATE INDEX "IDX_follow_user" ON "follows" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_follow_store" ON "follows" ("store_id")`);

        // 2. Create notification_preferences table
        await queryRunner.query(`
            CREATE TABLE "notification_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "new_product_alerts" boolean NOT NULL DEFAULT true,
                "order_updates" boolean NOT NULL DEFAULT true,
                "promotional_emails" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notification_preferences_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_pref_user" UNIQUE ("user_id")
            )
        `);

        // 3. Add Foreign Keys

        // Follow -> User
        await queryRunner.query(`
            ALTER TABLE "follows" 
            ADD CONSTRAINT "FK_follow_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // Follow -> Store
        await queryRunner.query(`
            ALTER TABLE "follows" 
            ADD CONSTRAINT "FK_follow_store" 
            FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        // NotificationPreference -> User
        await queryRunner.query(`
            ALTER TABLE "notification_preferences" 
            ADD CONSTRAINT "FK_pref_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop Foreign Keys
        await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_pref_user"`);
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_follow_store"`);
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_follow_user"`);

        // Drop Indices
        await queryRunner.query(`DROP INDEX "IDX_follow_store"`);
        await queryRunner.query(`DROP INDEX "IDX_follow_user"`);

        // Drop Tables
        await queryRunner.query(`DROP TABLE "notification_preferences"`);
        await queryRunner.query(`DROP TABLE "follows"`);
    }
}
