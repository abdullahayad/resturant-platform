-- A recurring event can now happen on more than one day of the week (e.g.
-- every Sunday and Tuesday), sharing the same title/price/capacity/etc.
-- across every day. Replaces the single "recurringDayOfWeek" column with an
-- array, backfilling any existing single-day value first.
ALTER TABLE "restaurant_events" ADD COLUMN "recurringDaysOfWeek" INTEGER[] NOT NULL DEFAULT '{}';

UPDATE "restaurant_events"
SET "recurringDaysOfWeek" = ARRAY["recurringDayOfWeek"]
WHERE "recurringDayOfWeek" IS NOT NULL;

ALTER TABLE "restaurant_events" DROP COLUMN "recurringDayOfWeek";
