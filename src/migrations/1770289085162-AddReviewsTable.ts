import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewsTable1770289085162 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migration skipped manually as table exists
    /*
    await queryRunner.query(`
  CREATE TABLE "reviews" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "rating" integer NOT NULL,
    "comment" text,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "booking_id" uuid NOT NULL,
    "reviewer_id" uuid NOT NULL,
    "store_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id")
  )
`);

    // Foreign Keys
    await queryRunner.query(`
  ALTER TABLE "reviews" 
  ADD CONSTRAINT "FK_reviews_booking_id" 
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
`);

    await queryRunner.query(`
  ALTER TABLE "reviews" 
  ADD CONSTRAINT "FK_reviews_reviewer_id" 
  FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
`);

    await queryRunner.query(`
  ALTER TABLE "reviews" 
  ADD CONSTRAINT "FK_reviews_store_id" 
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
`);

    await queryRunner.query(`
  ALTER TABLE "reviews" 
  ADD CONSTRAINT "FK_reviews_product_id" 
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
`);

    // Indexes
    await queryRunner.query(`
  CREATE INDEX "IDX_reviews_store_id" ON "reviews" ("store_id")
`);

    await queryRunner.query(`
  CREATE INDEX "IDX_reviews_product_id" ON "reviews" ("product_id")
`);

    // Unique constraint: One review per booking
    await queryRunner.query(`
  CREATE UNIQUE INDEX "IDX_reviews_booking_unique" ON "reviews" ("booking_id")
`);
*/
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_reviews_booking_unique"`);
    await queryRunner.query(`DROP INDEX "IDX_reviews_product_id"`);
    await queryRunner.query(`DROP INDEX "IDX_reviews_store_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_product_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_store_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_reviewer_id"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_booking_id"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
