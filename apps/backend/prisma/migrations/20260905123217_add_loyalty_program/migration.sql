-- AlterTable: add the column nullable first, backfill existing rows, then
-- enforce NOT NULL — a plain "ADD COLUMN ... NOT NULL" would fail outright
-- against a table that already has rows (see common/phone.ts for the TS
-- version of the same normalization logic this backfill replicates in SQL).
ALTER TABLE "chef_table_bookings" ADD COLUMN "guestPhoneNormalized" TEXT;

UPDATE "chef_table_bookings"
SET "guestPhoneNormalized" = (
  CASE
    WHEN regexp_replace("guestPhone", '\D', '', 'g') LIKE '964%'
      AND length(regexp_replace("guestPhone", '\D', '', 'g')) = 13
      THEN '0' || substring(regexp_replace("guestPhone", '\D', '', 'g') FROM 4)
    WHEN regexp_replace("guestPhone", '\D', '', 'g') NOT LIKE '0%'
      AND length(regexp_replace("guestPhone", '\D', '', 'g')) = 10
      THEN '0' || regexp_replace("guestPhone", '\D', '', 'g')
    ELSE regexp_replace("guestPhone", '\D', '', 'g')
  END
);

ALTER TABLE "chef_table_bookings" ALTER COLUMN "guestPhoneNormalized" SET NOT NULL;

-- CreateTable
CREATE TABLE "loyalty_tiers" (
    "id" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "thresholdCount" INTEGER NOT NULL,
    "rewardEn" TEXT NOT NULL,
    "rewardAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_rewards" (
    "id" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "tierLabelEn" TEXT NOT NULL,
    "tierLabelAr" TEXT NOT NULL,
    "rewardEn" TEXT NOT NULL,
    "rewardAr" TEXT NOT NULL,
    "bookingCountAtIssuance" INTEGER NOT NULL,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loyalty_rewards_guestPhone_idx" ON "loyalty_rewards"("guestPhone");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_rewards_guestPhone_tierId_key" ON "loyalty_rewards"("guestPhone", "tierId");

-- CreateIndex
CREATE INDEX "chef_table_bookings_guestPhoneNormalized_status_idx" ON "chef_table_bookings"("guestPhoneNormalized", "status");

-- AddForeignKey
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "loyalty_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
