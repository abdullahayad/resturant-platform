-- CreateTable
CREATE TABLE "restaurant_push_tokens" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_push_tokens_token_key" ON "restaurant_push_tokens"("token");

-- CreateIndex
CREATE INDEX "restaurant_push_tokens_restaurantId_idx" ON "restaurant_push_tokens"("restaurantId");

-- AddForeignKey
ALTER TABLE "restaurant_push_tokens" ADD CONSTRAINT "restaurant_push_tokens_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
