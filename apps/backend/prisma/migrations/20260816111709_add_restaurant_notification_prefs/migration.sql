-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "notifyNewBooking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewReview" BOOLEAN NOT NULL DEFAULT true;
