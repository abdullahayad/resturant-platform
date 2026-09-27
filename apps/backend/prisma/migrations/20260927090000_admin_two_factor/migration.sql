-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "admin_users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
