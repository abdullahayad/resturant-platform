-- CreateTable
CREATE TABLE "chef_signature_dishes" (
    "id" TEXT NOT NULL,
    "chefProfileId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,

    CONSTRAINT "chef_signature_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chef_signature_dishes_chefProfileId_dishId_key" ON "chef_signature_dishes"("chefProfileId", "dishId");

-- AddForeignKey
ALTER TABLE "chef_signature_dishes" ADD CONSTRAINT "chef_signature_dishes_chefProfileId_fkey" FOREIGN KEY ("chefProfileId") REFERENCES "chef_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chef_signature_dishes" ADD CONSTRAINT "chef_signature_dishes_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
