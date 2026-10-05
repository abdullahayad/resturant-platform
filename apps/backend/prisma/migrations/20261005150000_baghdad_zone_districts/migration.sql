-- Data migration: give Baghdad real neighborhood districts grouped under
-- two zones (Rusafa, Karkh), replacing the old flat two/three-district
-- setup. Written defensively with name-based lookups (not hardcoded ids),
-- since this runs unchanged against whatever Baghdad already looks like in
-- each environment it applies to (local dev vs. production have different
-- ids for the same rows) - same approach the restaurant_code_scheme
-- migration used for the same reason.
DO $$
DECLARE
  v_baghdad_id TEXT;
  v_old_rusafa_id TEXT;
  v_old_karkh_id TEXT;
  v_old_kadhimiya_id TEXT;
  v_zone_rusafa_id TEXT := gen_random_uuid()::text;
  v_zone_karkh_id TEXT := gen_random_uuid()::text;
  v_district_zayouna_id TEXT;
  v_district_mansour_id TEXT;
  v_district_kadhimiya_id TEXT;
BEGIN
  SELECT id INTO v_baghdad_id FROM provinces WHERE "nameEn" = 'Baghdad' LIMIT 1;
  IF v_baghdad_id IS NULL THEN
    -- No Baghdad province in this database yet (a brand new one seeds its
    -- own zones/districts directly via seed.ts) - nothing to migrate.
    RETURN;
  END IF;

  -- Capture the old flat districts before anything below creates new rows
  -- that might share their names.
  SELECT id INTO v_old_rusafa_id FROM districts WHERE "provinceId" = v_baghdad_id AND "zoneId" IS NULL AND "nameEn" = 'Rusafa' LIMIT 1;
  SELECT id INTO v_old_karkh_id FROM districts WHERE "provinceId" = v_baghdad_id AND "zoneId" IS NULL AND "nameEn" = 'Karkh' LIMIT 1;
  SELECT id INTO v_old_kadhimiya_id FROM districts WHERE "provinceId" = v_baghdad_id AND "zoneId" IS NULL AND "nameEn" = 'Kadhimiya' LIMIT 1;

  INSERT INTO zones (id, "provinceId", "nameEn", "nameAr", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (v_zone_rusafa_id, v_baghdad_id, 'Rusafa', 'الرصافة', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (v_zone_karkh_id, v_baghdad_id, 'Karkh', 'الكرخ', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  INSERT INTO districts (id, "provinceId", "zoneId", "nameEn", "nameAr", "code", "nextCodeSeq", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Karrada', 'الكرادة', 'KARR', 0, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Adhamiya', 'الأعظمية', 'ADHA', 0, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Sadr City', 'مدينة الصدر', 'SADR', 0, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Zayouna', 'زيونة', 'ZAYO', 0, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Baghdad Jadeed', 'بغداد الجديدة', 'BJAD', 0, true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Ur', 'أور', 'URDI', 0, true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Shaab', 'الشعب', 'SHAB', 0, true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Bab al-Sharqi', 'باب الشرقي', 'BABS', 0, true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_rusafa_id, 'Qahira', 'القاهرة', 'QAHI', 0, true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Mansour', 'المنصور', 'MANS', 0, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Yarmouk', 'اليرموك', 'YARM', 0, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Amiriya', 'العامرية', 'AMIR', 0, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Jihad', 'الجهاد', 'JIHA', 0, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Kadhimiya', 'الكاظمية', 'KADH', 0, true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Ghazaliya', 'الغزالية', 'GHAZ', 0, true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Hurriya', 'الحرية', 'HURR', 0, true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Dora', 'الدورة', 'DORA', 0, true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, v_baghdad_id, v_zone_karkh_id, 'Washash', 'الوشاش', 'WASH', 0, true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

  SELECT id INTO v_district_zayouna_id FROM districts WHERE "zoneId" = v_zone_rusafa_id AND "nameEn" = 'Zayouna' LIMIT 1;
  SELECT id INTO v_district_mansour_id FROM districts WHERE "zoneId" = v_zone_karkh_id AND "nameEn" = 'Mansour' LIMIT 1;
  SELECT id INTO v_district_kadhimiya_id FROM districts WHERE "zoneId" = v_zone_karkh_id AND "nameEn" = 'Kadhimiya' LIMIT 1;

  -- Any restaurant under the old flat Rusafa moves to Zayouna specifically
  -- (explicit instruction - this is where "Noon" was) before the old row
  -- is removed; anything under old Karkh or old (already-deactivated)
  -- Kadhimiya moves to the equivalent new district as a safe default so
  -- nothing is left pointing at a deleted row.
  IF v_old_rusafa_id IS NOT NULL THEN
    UPDATE restaurants SET "districtId" = v_district_zayouna_id WHERE "districtId" = v_old_rusafa_id;
    DELETE FROM districts WHERE id = v_old_rusafa_id;
  END IF;

  IF v_old_karkh_id IS NOT NULL THEN
    UPDATE restaurants SET "districtId" = v_district_mansour_id WHERE "districtId" = v_old_karkh_id;
    DELETE FROM districts WHERE id = v_old_karkh_id;
  END IF;

  IF v_old_kadhimiya_id IS NOT NULL THEN
    UPDATE restaurants SET "districtId" = v_district_kadhimiya_id WHERE "districtId" = v_old_kadhimiya_id;
    DELETE FROM districts WHERE id = v_old_kadhimiya_id;
  END IF;
END $$;
