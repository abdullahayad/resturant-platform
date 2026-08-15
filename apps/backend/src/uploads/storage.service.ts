import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly bucket = process.env.STORAGE_BUCKET ?? 'restaurant-platform';
  private readonly endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';

  private readonly client = new S3Client({
    endpoint: this.endpoint,
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE ?? 'true') === 'true',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY ?? 'restaurant',
      secretAccessKey: process.env.STORAGE_SECRET_KEY ?? 'restaurant123',
    },
  });

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      // Dev-only: bucket is world-readable so uploaded photos load directly via URL.
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

  async upload(file: { buffer: Buffer; mimetype: string; originalname: string }, folder: string) {
    const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return { url: `${this.endpoint}/${this.bucket}/${key}`, key };
  }
}
