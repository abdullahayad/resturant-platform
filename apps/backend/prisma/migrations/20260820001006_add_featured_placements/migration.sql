-- CreateEnum
CREATE TYPE "FeaturedStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeaturedInitiator" AS ENUM ('RESTAURANT', 'ADMIN');

-- CreateTable
CREATE TABLE "featured_placements" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "initiator" "FeaturedInitiator" NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "FeaturedStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "featured_placements_restaurantId_status_idx" ON "featured_placements"("restaurantId", "status");

-- AddForeignKey
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_placements" ADD CONSTRAINT "featured_placements_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
