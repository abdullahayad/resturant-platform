import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

// Deliberately excludes svg/html/js and anything else a browser would
// execute rather than just display — the bucket is public-read by design
// (photos need to load directly via URL with no signed-URL layer), so
// everything stored in it must be safe to serve as-is. The server decides
// the stored Content-Type from this map; the client's claimed mimetype is
// never trusted for that (see security review).
const ALLOWED_UPLOADS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function requireStorageCredential(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Configure it in your .env file before starting the server.`);
  }
  return value;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly bucket = process.env.STORAGE_BUCKET ?? 'restaurant-platform';
  private readonly endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';

  private readonly client = new S3Client({
    endpoint: this.endpoint,
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
    credentials: {
      accessKeyId: requireStorageCredential('STORAGE_ACCESS_KEY'),
      secretAccessKey: requireStorageCredential('STORAGE_SECRET_KEY'),
    },
  });

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      // Bucket is intentionally world-readable so uploaded photos load
      // directly via URL with no signed-URL layer — safe only because
      // upload() below restricts what can ever be stored in it.
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`],
              },
            ],
          }),
        }),
      );
    }
  }

  async upload(file: { buffer: Buffer; originalname: string }, folder: string) {
    const rawExt = file.originalname.includes('.') ? file.originalname.split('.').pop() : '';
    const ext = (rawExt ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const contentType = ALLOWED_UPLOADS[ext];
    if (!contentType) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${Object.keys(ALLOWED_UPLOADS).join(', ')}`,
      );
    }

    const key = `${folder}/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
      }),
    );
    return { url: `${this.endpoint}/${this.bucket}/${key}`, key };
  }
}
