-- A record of an upload the photo moderation check blocked - the flagged
-- image itself is never stored, just the fact that it happened, so an
-- admin has somewhere to actually see it.
CREATE TABLE "blocked_uploads" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT,
  "originalName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "blocked_uploads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blocked_uploads_restaurantId_idx" ON "blocked_uploads"("restaurantId");

ALTER TABLE "blocked_uploads"
  ADD CONSTRAINT "blocked_uploads_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
