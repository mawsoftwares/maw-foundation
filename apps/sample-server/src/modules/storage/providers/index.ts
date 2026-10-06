import path from 'node:path';
import { StorageProviderFactory } from '../core/StorageProviderFactory';
import { STORAGE_LOCAL_GATEWAY_PATH } from '../core/storage.constants';
import { LocalStorageProvider } from './local/LocalStorageProvider';
import { LocalUrlSigner } from './local/LocalUrlSigner';
import { AzureBlobStorageProvider } from './azure/AzureBlobStorageProvider';
import { AZURE_DESCRIPTOR, LOCAL_DESCRIPTOR, R2_DESCRIPTOR, S3_DESCRIPTOR } from './descriptors';
import { R2StorageProvider } from './r2/R2StorageProvider';
import { S3StorageProvider } from './s3/S3StorageProvider';

export { LocalStorageProvider } from './local/LocalStorageProvider';
export { LocalUrlSigner } from './local/LocalUrlSigner';
export { createLocalObjectRouter } from './local/LocalObjectGateway';
export { S3StorageProvider } from './s3/S3StorageProvider';
export { R2StorageProvider } from './r2/R2StorageProvider';
export { AzureBlobStorageProvider } from './azure/AzureBlobStorageProvider';
export * from './descriptors';

export interface DefaultProviderOptions {
  /** `STORAGE_LOCAL_ROOT` */
  readonly localRoot: string;
  readonly localSigner: LocalUrlSigner;
  /** Public origin of this server (used in local signed URLs). */
  readonly publicBaseUrl: string;
}

/** The single place that knows which providers exist. Register new ones here. */
export function createDefaultProviderFactory(options: DefaultProviderOptions): StorageProviderFactory {
  return new StorageProviderFactory()
    .register('local', (config) =>
      new LocalStorageProvider({
        rootDir: path.resolve(options.localRoot, config.basePath),
        signer: options.localSigner,
        publicBaseUrl: options.publicBaseUrl,
        gatewayPath: STORAGE_LOCAL_GATEWAY_PATH,
        tenantId: config.tenantId,
        configId: config.configId,
      }),
      LOCAL_DESCRIPTOR,
    )
    .register('s3', (config) => new S3StorageProvider(config), S3_DESCRIPTOR)
    .register('r2', (config) => new R2StorageProvider(config), R2_DESCRIPTOR)
    .register('azure', (config) => new AzureBlobStorageProvider(config), AZURE_DESCRIPTOR);
}
