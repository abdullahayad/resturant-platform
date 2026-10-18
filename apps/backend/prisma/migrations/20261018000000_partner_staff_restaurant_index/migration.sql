-- Every other restaurant-scoped child table has an index on restaurantId
-- (dishes, gallery_photos, reviews, etc.) except this one, even though the
-- Settings & Staff screen's staff list filters by it on every load.
CREATE INDEX "partner_staff_users_restaurantId_idx" ON "partner_staff_users"("restaurantId");
