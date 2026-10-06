import { createLogger } from '@mawsoftwares/sdk';
import { storageErrors } from '../core/storage.errors';
import type { FileListQuery, IStorageFileRepository } from '../repositories';
import type { PageResult, StorageFileView } from '../types/storage.types';
import { toFileView, type StorageActor } from './mappers';
import type { StorageConfigurationService } from './StorageConfigurationService';
import type { StorageFolderService } from './StorageFolderService';

const log = createLogger('storage:files');

/** File details, listing and deletion. */
export class StorageService {
  constructor(
    private readonly files: IStorageFileRepository,
    private readonly folders: StorageFolderService,
    private readonly configurations: StorageConfigurationService,
  ) {}

  async getFile(tenantId: string, fileId: string): Promise<StorageFileView> {
    const file = await this.files.findById(tenantId, fileId);
    if (!file) throw storageErrors.fileNotFound();
    return toFileView(file);
  }

  async listFiles(tenantId: string, query: FileListQuery): Promise<PageResult<StorageFileView>> {
    if (query.folderId !== null) await this.folders.require(tenantId, query.folderId);
    const result = await this.files.listUploadedInFolder(tenantId, query);
    return { items: result.items.map(toFileView), total: result.total };
  }

  /**
   * Soft-deletes first (the file disappears from every API), then removes the object.
   * If the provider call fails the row keeps `deleted_at` set with its previous status, which
   * is exactly what the future cleanup job selects for a retry — nothing is left half-visible.
   */
  async deleteFile(actor: StorageActor, fileId: string): Promise<void> {
    const { tenantId } = actor;
    const file = await this.files.softDelete(tenantId, fileId);
    if (!file) throw storageErrors.fileNotFound();
    try {
      const { provider } = await this.configurations.resolve(tenantId, file.storageConfigId, { allowInactive: true });
      await provider.deleteObject({ key: file.objectKey });
      await this.files.markDeleted(tenantId, fileId);
      log.info('File deleted', { tenantId, fileId, by: actor.userId });
    } catch {
      log.error('Object deletion failed; queued for cleanup', { tenantId, fileId });
    }
  }
}
