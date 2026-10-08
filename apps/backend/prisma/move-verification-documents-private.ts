import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { publicKeyFromUrl, storageSettings } from '../src/uploads/storage-config';

// One-off: verification documents submitted before they moved to the
// private bucket still live in the public one, reachable by anyone with
// the URL. This copies each into the private bucket, points the row at
// the new key, and deletes the public original. Safe to re-run - only
// rows without a storageKey are touched.
//
// Dry run by default; pass --apply to actually move anything.
const apply = process.argv.includes('--apply');

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Same settings StorageService uses (see src/uploads/storage-config.ts).
const { bucket, privateBucket, endpoint, region, forcePathStyle } = storageSettings();
const s3 = new S3Client({
  endpoint,
  region,
  forcePathStyle,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? '',
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? '',
  },
});

// Only files the generic /uploads route put in the public bucket.
function legacyUploadKey(url: string): string | null {
  const key = publicKeyFromUrl(url);
  return key?.startsWith('uploads/') ? key : null;
}

async function ensurePrivateBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: privateBucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: privateBucket }));
    console.log(`Created private bucket "${privateBucket}"`);
  }
}

async function main() {
  const rows = await db.verificationDocument.findMany({
    where: { storageKey: null, url: { not: null } },
    select: { id: true, restaurantId: true, url: true },
  });
  console.log(
    `${rows.length} legacy document(s) in the public bucket${apply ? '' : ' (dry run - pass --apply to move them)'}`,
  );
  if (rows.length === 0) return;
  if (apply) await ensurePrivateBucket();

  let moved = 0;
  let skipped = 0;
  for (const row of rows) {
    const sourceKey = legacyUploadKey(row.url!);
    if (!sourceKey) {
      console.warn(`  skip ${row.id}: URL isn't an upload in "${bucket}" (${row.url})`);
      skipped++;
      continue;
    }
    const ext = sourceKey.split('.').pop() ?? 'jpg';
    const targetKey = `verification-documents/${row.restaurantId}/${randomUUID()}.${ext}`;
    if (!apply) {
      console.log(`  would move ${row.id}: ${sourceKey} -> ${privateBucket}/${targetKey}`);
      continue;
    }

    await s3.send(
      new CopyObjectCommand({
        Bucket: privateBucket,
        Key: targetKey,
        CopySource: `${bucket}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`,
      }),
    );
    await db.verificationDocument.update({ where: { id: row.id }, data: { storageKey: targetKey, url: null } });
    // Last, so a failure anywhere above leaves the row still pointing at a
    // file that exists. A failed delete here only leaves a public copy
    // behind - reported, and the row is already moved.
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: sourceKey }));
    } catch (err) {
      console.warn(`  moved ${row.id}, but could not delete public original ${sourceKey}: ${String(err)}`);
    }
    console.log(`  moved ${row.id}`);
    moved++;
  }
  console.log(apply ? `Done: ${moved} moved, ${skipped} skipped.` : `${skipped} would be skipped.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
