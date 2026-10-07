-- AlterTable
ALTER TABLE "verification_documents" ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "url" DROP NOT NULL;
