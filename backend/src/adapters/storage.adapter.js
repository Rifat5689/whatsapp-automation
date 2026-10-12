import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

class LocalStorageAdapter {
  async put({ key, body }) {
    await fs.mkdir(uploadDirectory, { recursive: true });
    await fs.writeFile(path.join(uploadDirectory, key), body);
  }

  async get(key) {
    return fs.readFile(path.join(uploadDirectory, key));
  }

  async delete(key) {
    await fs.rm(path.join(uploadDirectory, key), { force: true });
  }
}

class CloudflareR2StorageAdapter {
  constructor() {
    this.bucket = env.cloudStorageBucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.cloudStorageAccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.cloudStorageAccessKey,
        secretAccessKey: env.cloudStorageSecretKey
      }
    });
  }

  async put({ key, body, contentType }) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async get(key) {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!response.Body) throw new Error('Stored photo has no content');
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

const storageAdapter = env.storageProvider === 'r2' ? new CloudflareR2StorageAdapter() : new LocalStorageAdapter();

export { CloudflareR2StorageAdapter, LocalStorageAdapter, storageAdapter };
