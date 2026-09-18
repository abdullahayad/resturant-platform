-- A brand with multiple branches - admin-managed only, links restaurants
-- together without touching their (still fully separate) logins/menus.
CREATE TABLE "restaurant_chains" (
  "id" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "restaurant_chains_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "restaurants" ADD COLUMN "chainId" TEXT;

CREATE INDEX "restaurants_chainId_idx" ON "restaurants"("chainId");

ALTER TABLE "restaurants"
  ADD CONSTRAINT "restaurants_chainId_fkey"
  FOREIGN KEY ("chainId") REFERENCES "restaurant_chains"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
