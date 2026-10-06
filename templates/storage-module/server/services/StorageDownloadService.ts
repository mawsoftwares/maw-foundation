import { createLogger } from '@mawsoftwares/sdk';
import type { StorageLimits } from '../core/storage.constants';
import { storageErrors } from '../core/storage.errors';
import type { IStorageFileRepository } from '../repositories';
import { StorageFileStatus, type DownloadUrlResponse } from '../types/storage.types';
import type { StorageActor } from './mappers';
import type { StorageConfigurationService } from './StorageConfigurationService';

const log = createLogger('storage:download');

export class StorageDownloadService {
  constructor(
    private readonly files: IStorageFileRepository,
    private readonly configurations: StorageConfigurationService,
    private readonly limits: StorageLimits,
  ) {}

  /** Short-lived signed URL; file bytes never pass through the MAW server. */
  async createDownloadUrl(
    actor: StorageActor,
    fileId: string,
    disposition: 'attachment' | 'inline' = 'attachment',
  ): Promise<DownloadUrlResponse> {
    const file = await this.files.findById(actor.tenantId, fileId);
    if (!file) throw storageErrors.fileNotFound();
    if (file.status !== StorageFileStatus.Uploaded) {
      throw storageErrors.uploadNotCompleted('The file is not available for download yet');
    }
    const { provider } = await this.configurations.resolve(actor.tenantId, file.storageConfigId);
    const result = await provider.createDownloadUrl({
      key: file.objectKey,
      fileName: file.originalName,
      contentType: file.mimeType,
      disposition,
      expiresInSeconds: this.limits.downloadUrlTtlSeconds,
    });
    log.info('Download URL generated', { tenantId: actor.tenantId, fileId });
    return { url: result.url, expiresIn: this.limits.downloadUrlTtlSeconds };
  }
}
