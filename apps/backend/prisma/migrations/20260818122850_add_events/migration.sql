-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_events" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "photoUrl" TEXT,
    "price" DECIMAL(10,2),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "eventDate" TIMESTAMP(3),
    "recurringDayOfWeek" INTEGER,
    "recurringTime" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restaurant_events_restaurantId_isActive_idx" ON "restaurant_events"("restaurantId", "isActive");

-- AddForeignKey
ALTER TABLE "restaurant_events" ADD CONSTRAINT "restaurant_events_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_events" ADD CONSTRAINT "restaurant_events_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
