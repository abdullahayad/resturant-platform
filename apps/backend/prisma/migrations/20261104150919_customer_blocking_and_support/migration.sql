-- CreateEnum
CREATE TYPE "CustomerSupportTopic" AS ENUM ('BOOKING', 'RESTAURANT_INFO', 'LOGIN', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerSupportStatus" AS ENUM ('OPEN', 'WAITING', 'CLOSED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedById" TEXT,
ADD COLUMN     "blockedReason" TEXT;

-- CreateTable
CREATE TABLE "customer_support_tickets" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "topic" "CustomerSupportTopic" NOT NULL,
    "status" "CustomerSupportStatus" NOT NULL DEFAULT 'OPEN',
    "restaurantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_support_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "fromAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_support_tickets_status_updatedAt_idx" ON "customer_support_tickets"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "customer_support_tickets_customerId_idx" ON "customer_support_tickets"("customerId");

-- CreateIndex
CREATE INDEX "customer_support_messages_ticketId_createdAt_idx" ON "customer_support_messages"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_support_tickets" ADD CONSTRAINT "customer_support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_support_tickets" ADD CONSTRAINT "customer_support_tickets_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_support_messages" ADD CONSTRAINT "customer_support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "customer_support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_support_messages" ADD CONSTRAINT "customer_support_messages_fromAdminId_fkey" FOREIGN KEY ("fromAdminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
