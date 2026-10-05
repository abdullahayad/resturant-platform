-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_provinceId_idx" ON "zones"("provinceId");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "districts" ADD COLUMN "zoneId" TEXT;

-- CreateIndex
CREATE INDEX "districts_zoneId_idx" ON "districts"("zoneId");

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
