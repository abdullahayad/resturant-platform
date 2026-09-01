-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "dishes" ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "gallery_photos" ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "restaurant_events" ADD COLUMN     "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'VISIBLE';

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "publishRejectionReason" TEXT,
ADD COLUMN     "publishReviewedAt" TIMESTAMP(3),
ADD COLUMN     "publishReviewedById" TEXT,
ADD COLUMN     "publishStatus" "PublishStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN     "publishSubmittedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "dishes_moderationStatus_idx" ON "dishes"("moderationStatus");

-- CreateIndex
CREATE INDEX "gallery_photos_moderationStatus_idx" ON "gallery_photos"("moderationStatus");

-- CreateIndex
CREATE INDEX "restaurant_events_moderationStatus_idx" ON "restaurant_events"("moderationStatus");

-- CreateIndex
CREATE INDEX "restaurants_publishStatus_idx" ON "restaurants"("publishStatus");

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_publishReviewedById_fkey" FOREIGN KEY ("publishReviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
