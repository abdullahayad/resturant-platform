-- "At most one cover photo per (restaurantId, album)" was only enforced in
-- GalleryService.setCover's transaction, not backed by the database itself -
-- two concurrent setCover(true) calls in the same album could both succeed.
-- A partial unique index (only indexing rows where isCover is true) closes
-- this at the database level; Prisma's schema DSL can't express a partial
-- index, so this exists only here, not as a schema.prisma @@index.

-- Defensive: clear out any duplicate covers that may already exist from the
-- race this migration is closing, keeping only the most recently created
-- cover per (restaurantId, album) so the unique index below can be created.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "restaurantId", "album" ORDER BY "createdAt" DESC) AS rn
  FROM "gallery_photos"
  WHERE "isCover" = true
)
UPDATE "gallery_photos"
SET "isCover" = false
WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "gallery_photos_one_cover_per_album"
  ON "gallery_photos" ("restaurantId", "album")
  WHERE "isCover" = true;
