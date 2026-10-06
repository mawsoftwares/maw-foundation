import path from 'node:path';
import { StorageProviderFactory } from '../core/StorageProviderFactory';
import { STORAGE_LOCAL_GATEWAY_PATH } from '../core/storage.constants';
import { LocalStorageProvider } from './local/LocalStorageProvider';
import { LocalUrlSigner } from './local/LocalUrlSigner';
import { S3StorageProvider } from './s3/S3StorageProvider';

export { LocalStorageProvider } from './local/LocalStorageProvider';
export { LocalUrlSigner } from './local/LocalUrlSigner';
export { createLocalObjectRouter } from './local/LocalObjectGateway';
export { S3StorageProvider } from './s3/S3StorageProvider';

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
    )
    .register('s3', (config) => new S3StorageProvider(config));
}
