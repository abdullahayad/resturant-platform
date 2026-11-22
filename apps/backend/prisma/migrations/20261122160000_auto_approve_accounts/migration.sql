-- Account approval was removed: restaurants waiting for it can start
-- setting up now. Publishing still needs the admin's review.
UPDATE "restaurants" SET "status" = 'APPROVED' WHERE "status" = 'PENDING_REVIEW';
