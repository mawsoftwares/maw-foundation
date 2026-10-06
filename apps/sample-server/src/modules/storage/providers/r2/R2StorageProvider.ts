import type { StorageProviderRuntimeConfig } from '../../core/StorageProviderFactory';
import { storageErrors } from '../../core/storage.errors';
import { S3StorageProvider } from '../s3/S3StorageProvider';

/**
 * Cloudflare R2 speaks the S3 API, so signing, HEAD and DELETE reuse the S3 provider. This class only
 * pins what R2 requires: an explicit account endpoint and the pseudo-region `auto`.
 */
export class R2StorageProvider extends S3StorageProvider {
  constructor(config: StorageProviderRuntimeConfig) {
    if (!config.endpoint) throw storageErrors.invalidInput('R2 storage requires an account endpoint');
    super({ ...config, region: 'auto' });
  }
}
