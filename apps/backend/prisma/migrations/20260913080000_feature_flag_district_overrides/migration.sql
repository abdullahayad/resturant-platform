-- AlterTable
ALTER TABLE "feature_flag_overrides" ADD COLUMN "districtId" TEXT;

-- CreateIndex
CREATE INDEX "feature_flag_overrides_districtId_idx" ON "feature_flag_overrides"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_overrides_featureFlagId_districtId_key" ON "feature_flag_overrides"("featureFlagId", "districtId");

-- AddForeignKey
ALTER TABLE "feature_flag_overrides" ADD CONSTRAINT "feature_flag_overrides_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
