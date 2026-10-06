-- CreateTable
CREATE TABLE "promotion_templates" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "photoUrl" TEXT,
    "discountType" "PromotionDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "scope" "PromotionScope" NOT NULL,
    "dishIds" TEXT[],
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringDayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotion_templates_restaurantId_idx" ON "promotion_templates"("restaurantId");

-- AddForeignKey
ALTER TABLE "promotion_templates" ADD CONSTRAINT "promotion_templates_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
