import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '@mawsoftwares/sdk';
import type {
  CreateDownloadUrlInput,
  CreateUploadUrlInput,
  DownloadUrlResult,
  ObjectMetadata,
  ObjectRef,
  StorageProvider,
  UploadUrlResult,
} from '../../core/StorageProvider';
import type { StorageProviderRuntimeConfig } from '../../core/StorageProviderFactory';
import { storageErrors } from '../../core/storage.errors';
import { assertSafeObjectKey } from '../../utils/object-key.util';

const log = createLogger('storage:s3');

function isNotFound(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { name, $metadata } = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return name === 'NotFound' || name === 'NoSuchKey' || $metadata?.httpStatusCode === 404;
}

function contentDisposition(kind: 'attachment' | 'inline', fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** AWS S3 and S3-compatible stores (MinIO, R2 via endpoint, ...). */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(config: StorageProviderRuntimeConfig) {
    if (!config.bucketName || !config.region) {
      throw storageErrors.invalidInput('S3 storage requires a bucket and a region');
    }
    this.bucket = config.bucketName;
    this.prefix = config.basePath ? `${config.basePath}/` : '';
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
      ...(config.credentials ? { credentials: config.credentials } : {}),
    });
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult> {
    try {
      const url = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.fullKey(input.key),
          ContentType: input.contentType,
          ContentLength: input.contentLength,
        }),
        { expiresIn: input.expiresInSeconds, signableHeaders: new Set(['content-type', 'content-length']) },
      );
      return {
        url,
        method: 'PUT',
        headers: { 'Content-Type': input.contentType },
        expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      };
    } catch (err) {
      throw this.fail('createUploadUrl', err);
    }
  }

  async createDownloadUrl(input: CreateDownloadUrlInput): Promise<DownloadUrlResult> {
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.fullKey(input.key),
          ResponseContentType: input.contentType,
          ResponseContentDisposition: contentDisposition(input.disposition, input.fileName),
        }),
        { expiresIn: input.expiresInSeconds },
      );
      return { url, expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString() };
    } catch (err) {
      throw this.fail('createDownloadUrl', err);
    }
  }

  async deleteObject({ key }: ObjectRef): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.fullKey(key) }));
    } catch (err) {
      throw this.fail('deleteObject', err);
    }
  }

  async objectExists(ref: ObjectRef): Promise<boolean> {
    try {
      await this.head(ref);
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw this.fail('objectExists', err);
    }
  }

  async getObjectMetadata(ref: ObjectRef): Promise<ObjectMetadata> {
    try {
      const out = await this.head(ref);
      return { size: out.ContentLength ?? 0, contentType: out.ContentType ?? null, etag: out.ETag ?? null };
    } catch (err) {
      if (isNotFound(err)) throw storageErrors.objectNotFound();
      throw this.fail('getObjectMetadata', err);
    }
  }

  async verifyAccess(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      throw this.fail('verifyAccess', err);
    }
  }

  private head({ key }: ObjectRef) {
    return this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.fullKey(key) }));
  }

  private fullKey(key: string): string {
    return `${this.prefix}${assertSafeObjectKey(key)}`;
  }

  /** Logs only the SDK error name — never messages, hosts, URLs or credentials. */
  private fail(operation: string, err: unknown): Error {
    if (err instanceof Error && err.name === 'StorageError') return err;
    log.error('S3 provider error', { operation, error: err instanceof Error ? err.name : 'Unknown' });
    return storageErrors.providerError();
  }
}
