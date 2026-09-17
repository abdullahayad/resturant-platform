-- Payment Accounts (Settings & Staff): each restaurant's own ZainCash / Qi
-- Card merchant credentials. The secret columns hold ciphertext only (see
-- common/secretEncryption.ts) - never plaintext.
ALTER TABLE "restaurants"
  ADD COLUMN "zainCashMerchantId" TEXT,
  ADD COLUMN "zainCashSecretEncrypted" TEXT,
  ADD COLUMN "zainCashConnectedAt" TIMESTAMP(3),
  ADD COLUMN "qiCardMerchantId" TEXT,
  ADD COLUMN "qiCardSecretEncrypted" TEXT,
  ADD COLUMN "qiCardConnectedAt" TIMESTAMP(3);
