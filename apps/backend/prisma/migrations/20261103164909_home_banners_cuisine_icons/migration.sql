-- CreateEnum
CREATE TYPE "HomeBannerLink" AS ENUM ('NONE', 'RESTAURANT', 'MOOD', 'HEALTHY', 'OFFERS', 'EVENTS');

-- AlterTable
ALTER TABLE "food_categories" ADD COLUMN     "icon" TEXT;

-- CreateTable
CREATE TABLE "home_banners" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "subtitleEn" TEXT,
    "subtitleAr" TEXT,
    "imageUrl" TEXT,
    "color" TEXT,
    "linkType" "HomeBannerLink" NOT NULL DEFAULT 'NONE',
    "linkValue" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "home_banners_isActive_sortOrder_idx" ON "home_banners"("isActive", "sortOrder");
