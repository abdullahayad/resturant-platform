-- Log of "Manage as this restaurant" support sessions an admin has started -
-- the actual session is a short-lived JWT (never stored), this table exists
-- purely so it's always visible, after the fact, which admin accessed which
-- restaurant's account and when.
CREATE TABLE "admin_support_sessions" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_support_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_support_sessions_restaurantId_idx" ON "admin_support_sessions"("restaurantId");

ALTER TABLE "admin_support_sessions"
  ADD CONSTRAINT "admin_support_sessions_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "admin_users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admin_support_sessions"
  ADD CONSTRAINT "admin_support_sessions_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
