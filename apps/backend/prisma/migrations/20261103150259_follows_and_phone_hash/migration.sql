-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "phoneHash" TEXT;

-- CreateTable
CREATE TABLE "customer_follows" (
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_follows_pkey" PRIMARY KEY ("customerId","restaurantId")
);

-- CreateIndex
CREATE INDEX "customer_follows_restaurantId_idx" ON "customer_follows"("restaurantId");

-- CreateIndex
CREATE INDEX "customers_phoneHash_idx" ON "customers"("phoneHash");

-- AddForeignKey
ALTER TABLE "customer_follows" ADD CONSTRAINT "customer_follows_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_follows" ADD CONSTRAINT "customer_follows_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
