-- Store tobacco policies: name the facility, not the product. Keeps the row
-- (and every restaurant's choice); skipped if the new name already exists.
UPDATE "facilities" SET "nameEn" = 'Smoking Area', "nameAr" = 'منطقة تدخين', "updatedAt" = CURRENT_TIMESTAMP
WHERE "nameEn" = 'Shisha' AND NOT EXISTS (SELECT 1 FROM "facilities" WHERE "nameEn" = 'Smoking Area');
