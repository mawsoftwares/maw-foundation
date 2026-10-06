import { randomUUID } from 'node:crypto';
import { createLogger } from '@mawsoftwares/sdk';
import type { StorageLimits } from '../core/storage.constants';
import { storageErrors } from '../core/storage.errors';
import type { IStorageFileRepository, IStorageFileVersionRepository } from '../repositories';
import {
  StorageFileStatus,
  type CreateUploadRequest,
  type CreateUploadResponse,
  type StorageFileView,
} from '../types/storage.types';
import { buildObjectKey, extensionOf } from '../utils/object-key.util';
import { toFileView, type StorageActor } from './mappers';
import type { StorageConfigurationService } from './StorageConfigurationService';
import type { StorageFolderService } from './StorageFolderService';

const log = createLogger('storage:upload');

export interface StorageUploadServiceDeps {
  readonly files: IStorageFileRepository;
  readonly versions: IStorageFileVersionRepository;
  readonly folders: StorageFolderService;
  readonly configurations: StorageConfigurationService;
  readonly limits: StorageLimits;
}

function mediaType(value: string): string {
  return value.split(';')[0]!.trim().toLowerCase();
}

export class StorageUploadService {
  constructor(private readonly deps: StorageUploadServiceDeps) {}

  /** Steps 4–11 of the lifecycle: validate, pick provider, create the pending record, sign the URL. */
  async requestUpload(actor: StorageActor, request: CreateUploadRequest): Promise<CreateUploadResponse> {
    const { tenantId } = actor;
    const folder = request.folderId ? await this.deps.folders.require(tenantId, request.folderId) : null;
    const configId = folder?.storageConfigId ?? (await this.deps.configurations.requireDefault(tenantId)).id;
    const { provider } = await this.deps.configurations.resolve(tenantId, configId);

    const fileId = randomUUID();
    const objectKey = buildObjectKey({ tenantId, folderId: folder?.id ?? null, fileId });
    await this.deps.files.create({
      id: fileId,
      tenantId,
      storageConfigId: configId,
      folderId: folder?.id ?? null,
      originalName: request.fileName,
      objectKey,
      mimeType: request.contentType,
      extension: extensionOf(request.fileName),
      fileSize: request.fileSize,
      uploadedBy: actor.userId,
    });

    const expiresInSeconds = this.deps.limits.uploadUrlTtlSeconds;
    try {
      const signed = await provider.createUploadUrl({
        key: objectKey,
        contentType: request.contentType,
        contentLength: request.fileSize,
        expiresInSeconds,
      });
      log.info('Upload requested', { tenantId, fileId, size: request.fileSize });
      return { fileId, uploadUrl: signed.url, method: signed.method, headers: signed.headers, expiresIn: expiresInSeconds };
    } catch (err) {
      await this.deps.files.markFailed(tenantId, fileId);
      log.error('Upload URL generation failed', { tenantId, fileId });
      throw err;
    }
  }

  /**
   * Steps 13–15: verify the object exists with the declared size/type, then mark it uploaded.
   * A missing object leaves the record `pending` (the client may still be uploading and can retry);
   * a mismatching object marks it `failed` and removes the stray object.
   */
  async completeUpload(actor: StorageActor, fileId: string): Promise<StorageFileView> {
    const { tenantId } = actor;
    const file = await this.deps.files.findById(tenantId, fileId);
    if (!file) throw storageErrors.fileNotFound();
    if (file.status === StorageFileStatus.Uploaded) return toFileView(file);
    if (file.status !== StorageFileStatus.Pending && file.status !== StorageFileStatus.Uploading) {
      throw storageErrors.uploadFailed('This upload can no longer be completed; request a new upload');
    }

    const { provider } = await this.deps.configurations.resolve(tenantId, file.storageConfigId);
    let metadata;
    try {
      metadata = await provider.getObjectMetadata({ key: file.objectKey });
    } catch (err) {
      if (err instanceof Error && 'reason' in err && (err as { reason: unknown }).reason === 'STORAGE_OBJECT_NOT_FOUND') {
        log.warn('Upload completion requested before object exists', { tenantId, fileId });
        throw storageErrors.uploadNotCompleted('The file has not been uploaded yet');
      }
      throw err;
    }

    const sizeMismatch = metadata.size !== file.fileSize;
    const typeMismatch = metadata.contentType !== null && mediaType(metadata.contentType) !== mediaType(file.mimeType);
    if (sizeMismatch || typeMismatch) {
      await this.deps.files.markFailed(tenantId, fileId);
      await provider.deleteObject({ key: file.objectKey }).catch(() => {
        log.error('Could not remove rejected object', { tenantId, fileId });
      });
      log.warn('Upload verification failed', { tenantId, fileId, sizeMismatch, typeMismatch });
      throw storageErrors.uploadFailed('The uploaded file does not match the declared size or type');
    }

    const updated = await this.deps.files.markUploaded(tenantId, fileId, metadata.etag?.replace(/"/g, '') ?? null);
    if (!updated) {
      const current = await this.deps.files.findById(tenantId, fileId);
      if (current?.status === StorageFileStatus.Uploaded) return toFileView(current);
      throw storageErrors.uploadFailed('This upload can no longer be completed; request a new upload');
    }
    await this.deps.versions.createForFile(updated, actor.userId);
    log.info('Upload completed', { tenantId, fileId, size: updated.fileSize });
    return toFileView(updated);
  }
}
