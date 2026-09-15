-- Enables spatial (GiST-indexed) location queries ahead of any actual
-- "restaurants near me" feature - see the `location` field's comment in
-- schema.prisma for why this is deliberately built now rather than
-- retrofitted once a customer app needs it.
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "restaurants" ADD COLUMN "location" geography(Point, 4326);

-- Backfill existing rows - the trigger below only fires on future writes.
UPDATE "restaurants"
SET "location" = ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326)::geography
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

CREATE INDEX "restaurants_location_idx" ON "restaurants" USING GIST ("location");

-- Keeps `location` in sync with latitude/longitude automatically, at the
-- database level - application code (Profile & Info's update flow, the
-- seed script, any future admin edit path) only ever needs to keep
-- writing latitude/longitude like it already does; nothing needs to know
-- `location` exists at all for it to stay correct.
CREATE OR REPLACE FUNCTION sync_restaurant_location() RETURNS trigger AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."location" := ST_SetSRID(ST_MakePoint(NEW."longitude"::double precision, NEW."latitude"::double precision), 4326)::geography;
  ELSE
    NEW."location" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_sync_location
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "restaurants"
  FOR EACH ROW EXECUTE FUNCTION sync_restaurant_location();
