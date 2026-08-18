/*
  Warnings:

  - You are about to drop the column `requestedAt` on the `chef_table_bookings` table. All the data in the column will be lost.
  - Added the required column `eventId` to the `chef_table_bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reservationDate` to the `chef_table_bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chef_table_bookings" DROP COLUMN "requestedAt",
ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "reservationDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "restaurant_events" ADD COLUMN     "capacity" INTEGER;

-- CreateIndex
CREATE INDEX "chef_table_bookings_eventId_reservationDate_idx" ON "chef_table_bookings"("eventId", "reservationDate");

-- AddForeignKey
ALTER TABLE "chef_table_bookings" ADD CONSTRAINT "chef_table_bookings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "restaurant_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
