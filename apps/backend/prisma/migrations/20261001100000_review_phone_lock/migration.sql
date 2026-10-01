-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "reviewerPhoneHash" TEXT;

-- CreateIndex
CREATE INDEX "reviews_restaurantId_reviewerPhoneHash_createdAt_idx" ON "reviews"("restaurantId", "reviewerPhoneHash", "createdAt");
