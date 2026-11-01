-- CreateEnum
CREATE TYPE "HealthyStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "dishes" ADD COLUMN     "isHealthy" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "healthyRejectionReason" TEXT,
ADD COLUMN     "healthyRequestNote" TEXT,
ADD COLUMN     "healthyRequestedAt" TIMESTAMP(3),
ADD COLUMN     "healthyReviewedAt" TIMESTAMP(3),
ADD COLUMN     "healthyStatus" "HealthyStatus" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "restaurants_healthyStatus_idx" ON "restaurants"("healthyStatus");
