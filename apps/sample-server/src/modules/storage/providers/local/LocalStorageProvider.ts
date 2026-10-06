import { createWriteStream, createReadStream, type ReadStream } from 'node:fs';
import { mkdir, rename, rm, stat, access, constants } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform, type Readable } from 'node:stream';
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
import { storageErrors } from '../../core/storage.errors';
import { assertSafeObjectKey } from '../../utils/object-key.util';
import type { LocalUrlSigner } from './LocalUrlSigner';

const log = createLogger('storage:local');

export interface LocalStorageProviderOptions {
  /** Absolute directory objects are stored under (already includes the tenant config base path). */
  readonly rootDir: string;
  readonly signer: LocalUrlSigner;
  /** Public origin of this server, e.g. `https://api.example.com`. */
  readonly publicBaseUrl: string;
  /** Path the local gateway router is mounted on. */
  readonly gatewayPath: string;
  readonly tenantId: string;
  readonly configId: string;
}

export class PayloadTooLargeError extends Error {}

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(private readonly options: LocalStorageProviderOptions) {
    this.root = path.resolve(options.rootDir);
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult> {
    const key = assertSafeObjectKey(input.key);
    const exp = this.expiry(input.expiresInSeconds);
    const token = this.options.signer.sign({
      tenantId: this.options.tenantId,
      configId: this.options.configId,
      key,
      op: 'put',
      exp,
      contentType: input.contentType,
      contentLength: input.contentLength,
    });
    return {
      url: this.gatewayUrl(token),
      method: 'PUT',
      headers: { 'Content-Type': input.contentType },
      expiresAt: new Date(exp * 1000).toISOString(),
    };
  }

  async createDownloadUrl(input: CreateDownloadUrlInput): Promise<DownloadUrlResult> {
    const key = assertSafeObjectKey(input.key);
    const exp = this.expiry(input.expiresInSeconds);
    const token = this.options.signer.sign({
      tenantId: this.options.tenantId,
      configId: this.options.configId,
      key,
      op: 'get',
      exp,
      contentType: input.contentType,
      fileName: input.fileName,
      disposition: input.disposition,
    });
    return { url: this.gatewayUrl(token), expiresAt: new Date(exp * 1000).toISOString() };
  }

  async deleteObject({ key }: ObjectRef): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async objectExists({ key }: ObjectRef): Promise<boolean> {
    try {
      return (await stat(this.resolve(key))).isFile();
    } catch (err) {
      if (isNotFound(err)) return false;
      throw this.fail('exists', err);
    }
  }

  async getObjectMetadata({ key }: ObjectRef): Promise<ObjectMetadata> {
    try {
      const info = await stat(this.resolve(key));
      if (!info.isFile()) throw storageErrors.objectNotFound();
      // Local disk does not record a content type; the gateway enforces it at upload time.
      return { size: info.size, contentType: null, etag: null };
    } catch (err) {
      if (isNotFound(err)) throw storageErrors.objectNotFound();
      throw this.fail('metadata', err);
    }
  }

  async verifyAccess(): Promise<void> {
    try {
      await mkdir(this.root, { recursive: true });
      await access(this.root, constants.R_OK | constants.W_OK);
    } catch (err) {
      throw this.fail('verify', err);
    }
  }

  // --- Used only by the local gateway (the sole place bytes touch this server) -------------

  async writeStream(key: string, source: Readable, maxBytes: number): Promise<number> {
    const target = this.resolve(key);
    const temp = `${target}.part-${randomBytes(6).toString('hex')}`;
    let written = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        written += chunk.length;
        if (written > maxBytes) callback(new PayloadTooLargeError());
        else callback(null, chunk);
      },
    });
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await pipeline(source, limiter, createWriteStream(temp, { flags: 'wx' }));
      await rename(temp, target);
      return written;
    } catch (err) {
      await rm(temp, { force: true });
      if (err instanceof PayloadTooLargeError) throw err;
      throw this.fail('write', err);
    }
  }

  async openReadStream(key: string): Promise<{ stream: ReadStream; size: number }> {
    const target = this.resolve(key);
    try {
      const info = await stat(target);
      if (!info.isFile()) throw storageErrors.objectNotFound();
      return { stream: createReadStream(target), size: info.size };
    } catch (err) {
      if (isNotFound(err)) throw storageErrors.objectNotFound();
      throw this.fail('read', err);
    }
  }

  // ------------------------------------------------------------------------------------------

  /** Resolves a provider-relative key inside the root; anything escaping the root is rejected. */
  private resolve(key: string): string {
    const resolved = path.resolve(this.root, assertSafeObjectKey(key));
    if (!resolved.startsWith(this.root + path.sep)) throw storageErrors.invalidInput('Invalid object key');
    return resolved;
  }

  private expiry(expiresInSeconds: number): number {
    return Math.floor(Date.now() / 1000) + expiresInSeconds;
  }

  private gatewayUrl(token: string): string {
    const base = this.options.publicBaseUrl.replace(/\/+$/, '');
    return `${base}${this.options.gatewayPath}/${token}`;
  }

  private fail(operation: string, err: unknown): Error {
    if (err instanceof Error && err.name === 'StorageError') return err;
    log.error('Local provider error', { operation, code: errorCode(err) });
    return storageErrors.providerError();
  }
}

function errorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : 'UNKNOWN';
}

function isNotFound(err: unknown): boolean {
  return errorCode(err) === 'ENOENT' || errorCode(err) === 'ENOTDIR';
}
