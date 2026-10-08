import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { isRealImage } from '../common/imageSignature';
import { ALLOWED_PRIVATE_UPLOADS, extensionOf, publicUrlForKey, storageSettings } from './storage-config';

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

const SIGNED_URL_TTL_SECONDS = 10 * 60;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly settings = storageSettings();
  private readonly bucket = this.settings.bucket;
  // See storageSettings() - objects here are only reachable through
  // signedUrl(), unlike the public-read `bucket` above.
  private readonly privateBucket = this.settings.privateBucket;

  private readonly client = new S3Client({
    endpoint: this.settings.endpoint,
    region: this.settings.region,
    forcePathStyle: this.settings.forcePathStyle,
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

    // Logged rather than thrown - a storage token without bucket-creation
    // rights shouldn't take the whole API down; only private uploads fail,
    // with a clear error, until the bucket is created by hand.
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.privateBucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.privateBucket }));
      } catch (err) {
        this.logger.error(`Could not create private bucket "${this.privateBucket}": ${String(err)}`);
      }
    }
  }

  async uploadPrivate(file: { buffer: Buffer; originalname: string }, folder: string) {
    const ext = extensionOf(file.originalname);
    const contentType = ALLOWED_PRIVATE_UPLOADS[ext];
    if (!contentType || !isRealImage(file.buffer)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${Object.keys(ALLOWED_PRIVATE_UPLOADS).join(', ')}`,
      );
    }

    const key = `${folder}/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.privateBucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
      }),
    );
    return { key };
  }

  signedUrl(key: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.privateBucket, Key: key }), {
      expiresIn: SIGNED_URL_TTL_SECONDS,
    });
  }

  async deletePrivate(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.privateBucket, Key: key }));
  }

  async upload(file: { buffer: Buffer; originalname: string }, folder: string) {
    const ext = extensionOf(file.originalname);
    const contentType = ALLOWED_UPLOADS[ext];
    if (!contentType) {
      throw new BadRequestException(`Unsupported file type. Allowed: ${Object.keys(ALLOWED_UPLOADS).join(', ')}`);
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
    return { url: publicUrlForKey(key), key };
  }
}
