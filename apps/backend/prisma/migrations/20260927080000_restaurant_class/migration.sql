-- CreateEnum
CREATE TYPE "RestaurantClass" AS ENUM ('LUXURY', 'UPSCALE', 'MODERATE', 'BUDGET');

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "class" "RestaurantClass";
