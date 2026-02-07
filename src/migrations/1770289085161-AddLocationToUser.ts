import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationToUser1770289085161 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "lat" decimal(10, 7) NULL,
      ADD COLUMN "lng" decimal(10, 7) NULL
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "lat",
      DROP COLUMN "lng"
    `);
    }

}
