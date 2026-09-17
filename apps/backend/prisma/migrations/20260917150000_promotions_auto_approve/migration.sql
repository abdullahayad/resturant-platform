-- Promotions no longer wait on admin approval - live immediately on
-- creation/edit. Update the default for new rows, and bring any
-- already-pending promotion (created under the old flow) live too, since
-- there is no longer a restaurant-side path to move it out of PENDING.
ALTER TABLE "promotions" ALTER COLUMN "status" SET DEFAULT 'APPROVED';

UPDATE "promotions" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';
