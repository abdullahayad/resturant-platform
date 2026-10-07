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

// Same resolution as storage.service.ts.
const bucket = process.env.STORAGE_BUCKET ?? 'restaurant-platform';
const privateBucket = process.env.STORAGE_PRIVATE_BUCKET ?? `${bucket}-private`;
const endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
const publicUrl = process.env.STORAGE_PUBLIC_URL ?? endpoint;
const s3 = new S3Client({
  endpoint,
  region: process.env.STORAGE_REGION ?? 'us-east-1',
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? '',
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? '',
  },
});

// Inverse of how storage.service.ts builds a public URL: no bucket segment
// behind a dedicated STORAGE_PUBLIC_URL, bucket segment on the path-style
// endpoint fallback.
function publicKeyFromUrl(url: string): string | null {
  const prefix = process.env.STORAGE_PUBLIC_URL ? `${publicUrl}/` : `${publicUrl}/${bucket}/`;
  if (!url.startsWith(prefix)) return null;
  const key = decodeURIComponent(url.slice(prefix.length).split('?')[0]);
  return key.startsWith('uploads/') ? key : null;
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
    const sourceKey = publicKeyFromUrl(row.url!);
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
