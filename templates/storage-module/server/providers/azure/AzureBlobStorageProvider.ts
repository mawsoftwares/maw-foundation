import { BlobSASPermissions, BlobServiceClient, SASProtocol, StorageSharedKeyCredential, type ContainerClient } from '@azure/storage-blob';
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

const log = createLogger('storage:azure');

/** Tolerate small clock differences between this server and Azure. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

function contentDisposition(kind: 'attachment' | 'inline', fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { statusCode?: number }).statusCode === 404;
}

/**
 * Azure Blob Storage via account-key SAS URLs. Credentials map onto the shared pair:
 * `accessKeyId` = storage account name, `secretAccessKey` = account key; `bucketName` = container.
 *
 * Note: unlike S3, a SAS cannot pin the upload's Content-Length. Size/type are therefore enforced
 * by the completion step (which deletes mismatching objects), exactly as for any other provider.
 */
export class AzureBlobStorageProvider implements StorageProvider {
  private readonly container: ContainerClient;
  private readonly credential: StorageSharedKeyCredential;
  private readonly prefix: string;
  /** SAS links are restricted to HTTPS unless the endpoint itself is plain HTTP (local Azurite). */
  private readonly https: boolean;

  constructor(config: StorageProviderRuntimeConfig) {
    if (!config.bucketName) throw storageErrors.invalidInput('Azure storage requires a container name');
    if (!config.credentials) throw storageErrors.invalidInput('Azure storage requires a storage account name and key');
    const { accessKeyId: account, secretAccessKey: key } = config.credentials;
    this.credential = new StorageSharedKeyCredential(account, key);
    const endpoint = config.endpoint ?? `https://${account}.blob.core.windows.net`;
    this.https = endpoint.startsWith('https://');
    this.container = new BlobServiceClient(endpoint, this.credential).getContainerClient(config.bucketName);
    this.prefix = config.basePath ? `${config.basePath}/` : '';
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult> {
    try {
      const expiresOn = new Date(Date.now() + input.expiresInSeconds * 1000);
      const url = await this.blob(input.key).generateSasUrl({
        permissions: BlobSASPermissions.parse('cw'),
        startsOn: new Date(Date.now() - CLOCK_SKEW_MS),
        expiresOn,
        ...(this.https ? { protocol: SASProtocol.Https } : {}),
      });
      return {
        url,
        method: 'PUT',
        headers: { 'Content-Type': input.contentType, 'x-ms-blob-type': 'BlockBlob' },
        expiresAt: expiresOn.toISOString(),
      };
    } catch (err) {
      throw this.fail('createUploadUrl', err);
    }
  }

  async createDownloadUrl(input: CreateDownloadUrlInput): Promise<DownloadUrlResult> {
    try {
      const expiresOn = new Date(Date.now() + input.expiresInSeconds * 1000);
      const url = await this.blob(input.key).generateSasUrl({
        permissions: BlobSASPermissions.parse('r'),
        startsOn: new Date(Date.now() - CLOCK_SKEW_MS),
        expiresOn,
        ...(this.https ? { protocol: SASProtocol.Https } : {}),
        contentType: input.contentType,
        contentDisposition: contentDisposition(input.disposition, input.fileName),
      });
      return { url, expiresAt: expiresOn.toISOString() };
    } catch (err) {
      throw this.fail('createDownloadUrl', err);
    }
  }

  async deleteObject({ key }: ObjectRef): Promise<void> {
    try {
      await this.blob(key).deleteIfExists();
    } catch (err) {
      throw this.fail('deleteObject', err);
    }
  }

  async objectExists({ key }: ObjectRef): Promise<boolean> {
    try {
      return await this.blob(key).exists();
    } catch (err) {
      throw this.fail('objectExists', err);
    }
  }

  async getObjectMetadata({ key }: ObjectRef): Promise<ObjectMetadata> {
    try {
      const props = await this.blob(key).getProperties();
      return { size: props.contentLength ?? 0, contentType: props.contentType ?? null, etag: props.etag ?? null };
    } catch (err) {
      if (isNotFound(err)) throw storageErrors.objectNotFound();
      throw this.fail('getObjectMetadata', err);
    }
  }

  async verifyAccess(): Promise<void> {
    try {
      await this.container.getProperties();
    } catch (err) {
      throw this.fail('verifyAccess', err);
    }
  }

  private blob(key: string) {
    return this.container.getBlockBlobClient(`${this.prefix}${assertSafeObjectKey(key)}`);
  }

  /** Logs only the error name/status — never messages (they can echo URLs) or credentials. */
  private fail(operation: string, err: unknown): Error {
    if (err instanceof Error && err.name === 'StorageError') return err;
    const status = (err as { statusCode?: number } | null)?.statusCode;
    log.error('Azure provider error', { operation, error: err instanceof Error ? err.name : 'Unknown', status });
    return storageErrors.providerError();
  }
}
