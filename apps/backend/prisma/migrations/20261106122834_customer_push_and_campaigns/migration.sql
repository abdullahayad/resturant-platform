-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "notifyCampaigns" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyFollowing" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "customer_push_tokens" (
    "token" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_push_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "customer_campaigns" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "linkType" "HomeBannerLink" NOT NULL DEFAULT 'NONE',
    "linkValue" TEXT,
    "minLevel" INTEGER,
    "followersOfRestaurantId" TEXT,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_campaign_deliveries" (
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_campaign_deliveries_pkey" PRIMARY KEY ("campaignId","customerId")
);

-- CreateIndex
CREATE INDEX "customer_push_tokens_customerId_idx" ON "customer_push_tokens"("customerId");

-- CreateIndex
CREATE INDEX "customer_campaigns_sentAt_idx" ON "customer_campaigns"("sentAt");

-- CreateIndex
CREATE INDEX "customer_campaign_deliveries_customerId_sentAt_idx" ON "customer_campaign_deliveries"("customerId", "sentAt");

-- AddForeignKey
ALTER TABLE "customer_push_tokens" ADD CONSTRAINT "customer_push_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_campaigns" ADD CONSTRAINT "customer_campaigns_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_campaign_deliveries" ADD CONSTRAINT "customer_campaign_deliveries_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "customer_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_campaign_deliveries" ADD CONSTRAINT "customer_campaign_deliveries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
