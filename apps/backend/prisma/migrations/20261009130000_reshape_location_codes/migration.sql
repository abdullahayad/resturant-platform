-- Shrinks the restaurant-code letter scheme: province stays 2 letters
-- (already true for every seeded province, no change needed there), zones
-- gain a new 1-letter code of their own, and district codes shrink from
-- 2-4 letters down to 1. Combined: province + [zone] + district, e.g.
-- Baghdad/Karkh/Mansour -> "BG" + "K" + "M" = "BGKM".
--
-- Only affects how NEW restaurant codes get generated going forward -
-- existing restaurants keep their already-issued codeNumber untouched.

-- Zones: new one-letter code, unique within its own province.
ALTER TABLE "zones" ADD COLUMN "code" TEXT;

UPDATE "zones" SET "code" = CASE "nameEn"
  WHEN 'Rusafa' THEN 'R'
  WHEN 'Karkh' THEN 'K'
  ELSE UPPER(LEFT(REGEXP_REPLACE("nameEn", '[^A-Za-z]', '', 'g'), 1))
END;

ALTER TABLE "zones" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "zones_provinceId_code_key" ON "zones"("provinceId", "code");

-- Districts: shrink to one letter. Uniqueness is now enforced in
-- MasterDataService (scoped to zone if the district has one, otherwise to
-- province), not a DB constraint - see District.code's comment in
-- schema.prisma for why a composite index can't express that here.
DROP INDEX "districts_provinceId_code_key";

UPDATE "districts" SET "code" = CASE "nameEn"
  -- Baghdad / Rusafa
  WHEN 'Karrada' THEN 'K'
  WHEN 'Adhamiya' THEN 'A'
  WHEN 'Sadr City' THEN 'S'
  WHEN 'Zayouna' THEN 'Z'
  WHEN 'Baghdad Jadeed' THEN 'J'
  WHEN 'Ur' THEN 'U'
  WHEN 'Shaab' THEN 'H'
  WHEN 'Bab al-Sharqi' THEN 'B'
  WHEN 'Qahira' THEN 'Q'
  -- Baghdad / Karkh
  WHEN 'Mansour' THEN 'M'
  WHEN 'Yarmouk' THEN 'Y'
  WHEN 'Amiriya' THEN 'A'
  WHEN 'Jihad' THEN 'J'
  WHEN 'Kadhimiya' THEN 'K'
  WHEN 'Ghazaliya' THEN 'G'
  WHEN 'Hurriya' THEN 'H'
  WHEN 'Dora' THEN 'D'
  WHEN 'Washash' THEN 'W'
  -- Zoneless provinces
  WHEN 'Hay Al-Hussain' THEN 'H'
  WHEN 'Basra Center' THEN 'C'
  WHEN 'Zubair' THEN 'Z'
  WHEN 'Erbil Center' THEN 'C'
  WHEN 'Ankawa' THEN 'A'
  WHEN 'Najaf Center' THEN 'C'
  WHEN 'Kufa' THEN 'K'
  WHEN 'Sulaymaniyah Center' THEN 'C'
  ELSE UPPER(LEFT(REGEXP_REPLACE("nameEn", '[^A-Za-z]', '', 'g'), 1))
END;
