-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;
