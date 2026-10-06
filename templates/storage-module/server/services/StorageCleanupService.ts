import { createLogger } from '@mawsoftwares/sdk';
import type { IStorageFileRepository } from '../repositories';
import type { StorageConfigurationService } from './StorageConfigurationService';

const log = createLogger('storage:cleanup');

export interface CleanupOptions {
  /** Pending/uploading records older than this are treated as abandoned. */
  readonly pendingOlderThanHours: number;
  readonly batchSize: number;
}

export interface CleanupReport {
  readonly abandonedUploads: number;
  readonly retriedDeletions: number;
  readonly errors: number;
}

export const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = { pendingOlderThanHours: 24, batchSize: 200 };

/**
 * System-level maintenance (runs outside any request, so it is the one place that reads across
 * tenants — each file is then handled strictly with its own tenant id).
 *  1. Abandoned uploads: remove any partial object, mark the record `failed`.
 *  2. Interrupted deletions: retry the provider delete for soft-deleted files, then mark `deleted`.
 * Idempotent and safe to run concurrently with normal traffic.
 */
export class StorageCleanupService {
  constructor(
    private readonly files: IStorageFileRepository,
    private readonly configurations: StorageConfigurationService,
  ) {}

  async run(options: CleanupOptions = DEFAULT_CLEANUP_OPTIONS): Promise<CleanupReport> {
    let abandonedUploads = 0;
    let retriedDeletions = 0;
    let errors = 0;

    const cutoff = new Date(Date.now() - options.pendingOlderThanHours * 3_600_000);
    for (const file of await this.files.listStalePending(cutoff, options.batchSize)) {
      try {
        const { provider } = await this.configurations.resolve(file.tenantId, file.storageConfigId, { allowInactive: true });
        await provider.deleteObject({ key: file.objectKey });
        await this.files.markFailed(file.tenantId, file.id);
        abandonedUploads++;
      } catch {
        errors++;
        log.error('Could not clean up abandoned upload', { tenantId: file.tenantId, fileId: file.id });
      }
    }

    for (const file of await this.files.listPendingObjectDeletion(options.batchSize)) {
      try {
        const { provider } = await this.configurations.resolve(file.tenantId, file.storageConfigId, { allowInactive: true });
        await provider.deleteObject({ key: file.objectKey });
        await this.files.markDeleted(file.tenantId, file.id);
        retriedDeletions++;
      } catch {
        errors++;
        log.error('Could not retry object deletion', { tenantId: file.tenantId, fileId: file.id });
      }
    }

    log.info('Storage cleanup finished', { abandonedUploads, retriedDeletions, errors });
    return { abandonedUploads, retriedDeletions, errors };
  }
}
