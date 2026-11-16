-- CreateTable
CREATE TABLE "stamp_cards" (
    "restaurantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "visitsRequired" INTEGER NOT NULL DEFAULT 5,
    "rewardEn" TEXT NOT NULL,
    "rewardAr" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stamp_cards_pkey" PRIMARY KEY ("restaurantId")
);

-- CreateTable
CREATE TABLE "stamp_rewards" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rewardEn" TEXT NOT NULL,
    "rewardAr" TEXT NOT NULL,
    "redeemedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stamp_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stamp_rewards_restaurantId_customerId_createdAt_idx" ON "stamp_rewards"("restaurantId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "stamp_rewards_customerId_createdAt_idx" ON "stamp_rewards"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "stamp_cards" ADD CONSTRAINT "stamp_cards_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_rewards" ADD CONSTRAINT "stamp_rewards_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stamp_rewards" ADD CONSTRAINT "stamp_rewards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
