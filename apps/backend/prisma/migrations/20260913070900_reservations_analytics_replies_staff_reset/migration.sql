-- AlterTable
ALTER TABLE "notification_recipients" ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "replyText" TEXT;

-- AlterTable
ALTER TABLE "partner_staff_users" ADD COLUMN     "passwordResetCodeHash" TEXT,
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3);
