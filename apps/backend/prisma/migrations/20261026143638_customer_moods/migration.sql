-- CreateEnum
CREATE TYPE "MoodGroup" AS ENUM ('CLASSIC', 'PEOPLE', 'PLACE', 'TIME', 'FOOD', 'SEASONAL');

-- CreateTable
CREATE TABLE "moods" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "group" "MoodGroup" NOT NULL DEFAULT 'CLASSIC',
    "foodsEn" TEXT,
    "foodsAr" TEXT,
    "matchNotes" TEXT,
    "businessTypeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "foodCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "facilityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventTypeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "classes" "RestaurantClass"[] DEFAULT ARRAY[]::"RestaurantClass"[],
    "healthyOnly" BOOLEAN NOT NULL DEFAULT false,
    "openAfterMidnight" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moods_isActive_sortOrder_idx" ON "moods"("isActive", "sortOrder");
