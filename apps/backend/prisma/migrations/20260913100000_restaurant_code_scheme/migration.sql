-- Province codes: two letters, used as the first segment of every
-- restaurant code in that province.
ALTER TABLE "provinces" ADD COLUMN "code" TEXT;

UPDATE "provinces" SET "code" = CASE "nameEn"
  WHEN 'Baghdad' THEN 'BG'
  WHEN 'Basra' THEN 'BS'
  WHEN 'Erbil' THEN 'EB'
  WHEN 'Najaf' THEN 'NJ'
  WHEN 'Sulaymaniyah' THEN 'SU'
  ELSE UPPER(LEFT(REGEXP_REPLACE("nameEn", '[^A-Za-z]', '', 'g'), 2))
END;

ALTER TABLE "provinces" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- District codes (unique per province, not globally - the province code
-- already disambiguates) + a running per-district counter for new
-- restaurant codes going forward.
ALTER TABLE "districts" ADD COLUMN "code" TEXT;
ALTER TABLE "districts" ADD COLUMN "nextCodeSeq" INTEGER NOT NULL DEFAULT 0;

UPDATE "districts" SET "code" = CASE "nameEn"
  WHEN 'Karkh' THEN 'KR'
  WHEN 'Rusafa' THEN 'RS'
  WHEN 'Kadhimiya' THEN 'KD'
  WHEN 'Basra Center' THEN 'BC'
  WHEN 'Zubair' THEN 'ZB'
  WHEN 'Erbil Center' THEN 'EC'
  WHEN 'Ankawa' THEN 'AN'
  WHEN 'Najaf Center' THEN 'NC'
  WHEN 'Kufa' THEN 'KF'
  WHEN 'Sulaymaniyah Center' THEN 'SC'
  ELSE UPPER(LEFT(REGEXP_REPLACE("nameEn", '[^A-Za-z]', '', 'g'), 2))
END;

ALTER TABLE "districts" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "districts_provinceId_code_key" ON "districts"("provinceId", "code");

-- Regenerate every existing restaurant's codeNumber under the new scheme
-- (city code + district code + a 3-digit number that resets per district),
-- numbered in original creation order so the oldest restaurant in each
-- district keeps the lowest number. A restaurant missing a province and/or
-- district (possible - both are optional at registration) falls back to
-- "XX" for the missing segment(s); this can't collide with a real province
-- or district code since none of the ones mapped above resolve to "XX".
WITH numbered AS (
  SELECT
    r.id,
    COALESCE(p.code, 'XX') AS province_code,
    COALESCE(d.code, 'XX') AS district_code,
    ROW_NUMBER() OVER (PARTITION BY r."provinceId", r."districtId" ORDER BY r."createdAt") AS seq
  FROM "restaurants" r
  LEFT JOIN "provinces" p ON p.id = r."provinceId"
  LEFT JOIN "districts" d ON d.id = r."districtId"
)
UPDATE "restaurants" r
SET "codeNumber" = numbered.province_code || numbered.district_code || LPAD(numbered.seq::text, 3, '0')
FROM numbered
WHERE r.id = numbered.id;

-- Seed each district's running counter to how many restaurants it already
-- has, so the next new restaurant continues the sequence instead of
-- restarting at 1 and colliding with an existing code.
UPDATE "districts" d
SET "nextCodeSeq" = COALESCE((SELECT COUNT(*) FROM "restaurants" r WHERE r."districtId" = d.id), 0);
