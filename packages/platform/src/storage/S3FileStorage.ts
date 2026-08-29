import type {
  IFileStorage,
  StoredFile,
  UploadRequest,
  PresignedUpload,
  FileListOptions,
  FileListResult,
} from '@mawsoftwares/sdk/contracts/IFileStorage';

export interface S3FileStorageOptions {
  readonly bucket: string;
  readonly region: string;
  readonly prefix?: string;
  readonly endpoint?: string;
  readonly forcePathStyle?: boolean;
  readonly credentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
  };
}

interface S3Client {
  send(command: unknown): Promise<unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type S3Module = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PresignerModule = any;

export class S3FileStorage implements IFileStorage {
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly options: S3FileStorageOptions;
  private client: S3Client | null = null;
  private s3Mod: S3Module = null;
  private presignerMod: PresignerModule = null;

  constructor(options: S3FileStorageOptions) {
    this.bucket = options.bucket;
    this.prefix = options.prefix?.replace(/\/$/, '') ?? '';
    this.options = options;
  }

  private async getClient(): Promise<S3Client> {
    if (this.client) return this.client;
    const mod = await import('@aws-sdk/client-s3' as string);
    this.s3Mod = mod;
    this.client = new mod.S3Client({
      region: this.options.region,
      ...(this.options.endpoint ? { endpoint: this.options.endpoint } : {}),
      ...(this.options.forcePathStyle ? { forcePathStyle: true } : {}),
      ...(this.options.credentials ? { credentials: this.options.credentials } : {}),
    }) as S3Client;
    return this.client;
  }

  private async getS3(): Promise<S3Module> {
    if (this.s3Mod) return this.s3Mod;
    this.s3Mod = await import('@aws-sdk/client-s3' as string);
    return this.s3Mod;
  }

  private async getPresigner(): Promise<PresignerModule> {
    if (this.presignerMod) return this.presignerMod;
    this.presignerMod = await import('@aws-sdk/s3-request-presigner' as string);
    return this.presignerMod;
  }

  private fullKey(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  async put(key: string, data: Buffer | ReadableStream | Uint8Array, opts: UploadRequest): Promise<StoredFile> {
    const client = await this.getClient();
    const s3 = await this.getS3();
    const fullKey = this.fullKey(key);

    let body: Buffer | Uint8Array;
    if (data instanceof Buffer || data instanceof Uint8Array) {
      body = data;
    } else {
      const reader = (data as ReadableStream<Uint8Array>).getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      body = Buffer.concat(chunks);
    }

    const metadata: Record<string, string> = {
      ...(opts.metadata ?? {}),
      'original-name': opts.originalName,
    };

    const command = new s3.PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      Body: body,
      ContentType: opts.mimeType,
      ContentLength: opts.size,
      Metadata: metadata,
    });

    await client.send(command);

    return {
      key,
      url: this.buildUrl(fullKey),
      size: opts.size,
      mimeType: opts.mimeType,
      originalName: opts.originalName,
      createdAt: new Date().toISOString(),
      metadata: opts.metadata,
    };
  }

  async getUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const client = await this.getClient();
    const s3 = await this.getS3();
    const presigner = await this.getPresigner();
    const fullKey = this.fullKey(key);

    const command = new s3.GetObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    });

    return presigner.getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  }

  async head(key: string): Promise<StoredFile | null> {
    const client = await this.getClient();
    const s3 = await this.getS3();
    const fullKey = this.fullKey(key);

    try {
      const command = new s3.HeadObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      });

      const response = await client.send(command) as {
        ContentLength?: number;
        ContentType?: string;
        LastModified?: Date;
        Metadata?: Record<string, string>;
      };

      return {
        key,
        url: this.buildUrl(fullKey),
        size: response.ContentLength ?? 0,
        mimeType: response.ContentType ?? 'application/octet-stream',
        originalName: response.Metadata?.['original-name'] ?? key.split('/').pop() ?? key,
        createdAt: response.LastModified?.toISOString() ?? new Date().toISOString(),
        metadata: response.Metadata,
      };
    } catch (err: unknown) {
      if (isNotFoundError(err)) return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    const s3 = await this.getS3();
    const fullKey = this.fullKey(key);

    const command = new s3.DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    });

    await client.send(command);
  }

  async list(options?: FileListOptions): Promise<FileListResult> {
    const client = await this.getClient();
    const s3 = await this.getS3();
    const maxKeys = options?.maxKeys ?? 1000;

    let prefix = this.prefix;
    if (options?.prefix) {
      prefix = prefix ? `${prefix}/${options.prefix}` : options.prefix;
    }

    const command = new s3.ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix || undefined,
      MaxKeys: maxKeys,
      ContinuationToken: options?.continuationToken,
    });

    const response = await client.send(command) as {
      Contents?: Array<{ Key?: string; Size?: number; LastModified?: Date }>;
      NextContinuationToken?: string;
      IsTruncated?: boolean;
    };

    const files: StoredFile[] = (response.Contents ?? []).map((obj) => {
      const objKey = obj.Key ?? '';
      const userKey = this.prefix ? objKey.slice(this.prefix.length + 1) : objKey;
      return {
        key: userKey,
        url: this.buildUrl(objKey),
        size: obj.Size ?? 0,
        mimeType: 'application/octet-stream',
        originalName: objKey.split('/').pop() ?? objKey,
        createdAt: obj.LastModified?.toISOString() ?? new Date().toISOString(),
      };
    });

    return {
      files,
      continuationToken: response.NextContinuationToken,
      hasMore: response.IsTruncated ?? false,
    };
  }

  async createPresignedUpload(request: UploadRequest, expiresInSeconds = 3600): Promise<PresignedUpload> {
    const client = await this.getClient();
    const s3 = await this.getS3();
    const presigner = await this.getPresigner();
    const fullKey = this.fullKey(request.key);

    const command = new s3.PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      ContentType: request.mimeType,
      Metadata: {
        ...(request.metadata ?? {}),
        'original-name': request.originalName,
      },
    });

    const url = await presigner.getSignedUrl(client, command, { expiresIn: expiresInSeconds });

    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': request.mimeType },
      key: request.key,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };
  }

  private buildUrl(fullKey: string): string {
    if (this.options.endpoint) {
      const base = this.options.endpoint.replace(/\/$/, '');
      return this.options.forcePathStyle
        ? `${base}/${this.bucket}/${fullKey}`
        : `${base}/${fullKey}`;
    }
    return `https://${this.bucket}.s3.${this.options.region}.amazonaws.com/${fullKey}`;
  }
}

function isNotFoundError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const name = (err as { name?: string }).name;
  return name === 'NotFound' || name === 'NoSuchKey' || name === '404';
}
