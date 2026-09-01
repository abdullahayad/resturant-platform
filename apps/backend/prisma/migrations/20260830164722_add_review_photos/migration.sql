-- AlterEnum
ALTER TYPE "GalleryAlbum" ADD VALUE 'REVIEW';

-- AlterTable
ALTER TABLE "gallery_photos" ADD COLUMN "reviewId" TEXT;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
