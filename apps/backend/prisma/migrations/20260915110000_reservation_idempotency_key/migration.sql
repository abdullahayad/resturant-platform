-- AlterTable
ALTER TABLE "chef_table_bookings" ADD COLUMN "idempotencyKey" TEXT;

-- Backfill existing rows with a distinct random value each (not a shared
-- constant) so the NOT NULL + UNIQUE constraint below can be satisfied -
-- these are historical bookings that predate idempotency keys entirely,
-- so there's nothing meaningful to derive one from.
UPDATE "chef_table_bookings" SET "idempotencyKey" = gen_random_uuid()::text WHERE "idempotencyKey" IS NULL;

ALTER TABLE "chef_table_bookings" ALTER COLUMN "idempotencyKey" SET NOT NULL;
CREATE UNIQUE INDEX "chef_table_bookings_idempotencyKey_key" ON "chef_table_bookings"("idempotencyKey");
