-- CreateEnum
CREATE TYPE "ChefRole" AS ENUM ('HEAD_CHEF', 'SOUS_CHEF');

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "crewCount" INTEGER,
ADD COLUMN     "crewPhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "chef_profiles" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "role" "ChefRole" NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "speciality" TEXT,
    "yearsExperience" INTEGER,
    "awards" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chef_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chef_profiles_restaurantId_role_key" ON "chef_profiles"("restaurantId", "role");

-- AddForeignKey
ALTER TABLE "chef_profiles" ADD CONSTRAINT "chef_profiles_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
