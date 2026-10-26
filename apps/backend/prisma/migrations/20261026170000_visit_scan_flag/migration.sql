-- The partner app's "Scan Visit" section (scanning a customer's visit QR).
-- Off by default: there is nothing to scan until the customer app and its
-- accounts launch, so it's switched on from the admin Feature Flags page
-- at that point.
INSERT INTO "feature_flags" ("id", "key", "labelEn", "defaultEnabled", "updatedAt")
SELECT gen_random_uuid()::text, 'visitScan', 'Scan Visit (customer visit codes)', false, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "feature_flags" WHERE "key" = 'visitScan');
