-- DropIndex
DROP INDEX "restaurants_location_idx";

-- CreateTable
CREATE TABLE "restaurant_activity_logs" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "staffId" TEXT,
    "impersonatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restaurant_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_activity_logs_restaurantId_createdAt_idx" ON "restaurant_activity_logs"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "restaurant_activity_logs_section_createdAt_idx" ON "restaurant_activity_logs"("section", "createdAt");

-- AddForeignKey
ALTER TABLE "restaurant_activity_logs" ADD CONSTRAINT "restaurant_activity_logs_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_activity_logs" ADD CONSTRAINT "restaurant_activity_logs_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "partner_staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_activity_logs" ADD CONSTRAINT "restaurant_activity_logs_impersonatedByAdminId_fkey" FOREIGN KEY ("impersonatedByAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
