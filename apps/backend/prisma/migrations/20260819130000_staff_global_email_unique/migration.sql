-- DropIndex
DROP INDEX "partner_staff_users_restaurantId_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "partner_staff_users_email_key" ON "partner_staff_users"("email");
