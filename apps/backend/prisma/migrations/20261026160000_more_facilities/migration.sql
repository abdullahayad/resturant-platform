-- Facilities the customer app's moods match on (see the Mood model). Only
-- added where no facility with the same English name exists yet, so a
-- facility an admin already created by hand is never duplicated.
INSERT INTO "facilities" ("id", "nameEn", "nameAr", "isActive", "sortOrder", "updatedAt")
SELECT gen_random_uuid()::text, v."nameEn", v."nameAr", true,
       (SELECT COALESCE(MAX("sortOrder"), 0) FROM "facilities") + v.n, CURRENT_TIMESTAMP
FROM (VALUES
  (1, 'Private Room', 'غرفة خاصة'),
  (2, 'River View', 'إطلالة على النهر'),
  (3, 'Rooftop', 'سطح'),
  (4, 'Big Screen', 'شاشة كبيرة'),
  (5, 'Power Sockets', 'مقابس كهرباء'),
  (6, 'Quiet', 'هادئ')
) AS v(n, "nameEn", "nameAr")
WHERE NOT EXISTS (SELECT 1 FROM "facilities" f WHERE lower(f."nameEn") = lower(v."nameEn"));
