-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN "aiSuggestionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "restaurants" ADD COLUMN "aiSuggestionCountDate" TIMESTAMP(3);

-- Seed the new flaggable feature. Off by default (unlike every other flag
-- seeded true in 20260912130000_add_feature_flags) since this is the app's
-- first paid external AI call - stays off platform-wide until turned on
-- restaurant-by-restaurant via the admin Feature Flags page.
INSERT INTO "feature_flags" ("id", "key", "labelEn", "defaultEnabled", "updatedAt") VALUES
    (gen_random_uuid()::text, 'aiReviewReplies', 'AI Reply Suggestions (Reviews)', false, CURRENT_TIMESTAMP);
