-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_overrides" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "restaurantId" TEXT,
    "provinceId" TEXT,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_restaurantId_idx" ON "feature_flag_overrides"("restaurantId");

-- CreateIndex
CREATE INDEX "feature_flag_overrides_provinceId_idx" ON "feature_flag_overrides"("provinceId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_featureFlagId_restaurantId_key" ON "feature_flag_overrides"("featureFlagId", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_featureFlagId_provinceId_key" ON "feature_flag_overrides"("featureFlagId", "provinceId");

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed one row per flaggable partner-app sidebar section. All start enabled
-- (matches what every existing restaurant already sees today, so this
-- migration changes nothing about current behavior) except "analytics",
-- since Deep Analytics is still just a placeholder screen with no real data
-- behind it — seeding it off means it's already wired for a staged rollout
-- the day it's actually built, no further migration needed then.
INSERT INTO "feature_flags" ("id", "key", "labelEn", "defaultEnabled", "updatedAt") VALUES
    (gen_random_uuid()::text, 'menu', 'Menu Management', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'promotions', 'Promotions', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'advertising', 'Advertising', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'gallery', 'Photo Gallery', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'chefManagement', 'Chef Management', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'chefTable', 'Chef Table & Events', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'reviews', 'Customer Reviews', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'reservations', 'Reservations', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'announcements', 'Inbox', true, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'analytics', 'Deep Analytics', false, CURRENT_TIMESTAMP);
