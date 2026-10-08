// Bucket names and public-URL building, shared by StorageService and the
// one-off prisma/move-verification-documents-private.ts script so the two
// can't drift apart (the script has to recognize URLs this code produced).
// Read at call time, not import time, so a script's dotenv load always wins.
export function storageSettings() {
  const bucket = process.env.STORAGE_BUCKET ?? 'restaurant-platform';
  const endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
  return {
    bucket,
    // Never given a public-read policy - objects here are only reachable
    // through short-lived signed URLs.
    privateBucket: process.env.STORAGE_PRIVATE_BUCKET ?? `${bucket}-private`,
    endpoint,
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
    // Providers like Cloudflare R2 serve public reads from a dedicated
    // public URL (pub-*.r2.dev, a custom domain) that's already scoped to
    // the one bucket - no bucket segment in the path. MinIO has no such
    // split, so the fallback is the path-style S3 endpoint, which needs it.
    publicBase: process.env.STORAGE_PUBLIC_URL || `${endpoint}/${bucket}`,
  };
}

export function publicUrlForKey(key: string): string {
  return `${storageSettings().publicBase}/${key}`;
}

// Inverse of publicUrlForKey - null for anything not in the public bucket.
export function publicKeyFromUrl(url: string): string | null {
  const prefix = `${storageSettings().publicBase}/`;
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length).split('?')[0]);
}

// Private uploads are documents an admin reviews (business licenses), so
// photos only - no video, and the bytes must actually be an image.
export const ALLOWED_PRIVATE_UPLOADS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function extensionOf(originalname: string): string {
  const rawExt = originalname.includes('.') ? originalname.split('.').pop() : '';
  return (rawExt ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
