import type {
  StorageConfigurationView,
  StorageFile,
  StorageFileView,
  StorageFolder,
  StorageFolderView,
  StorageProviderConfig,
} from '../types/storage.types';

export interface StorageActor {
  readonly tenantId: string;
  readonly userId: string | null;
}

export function toFileView(file: StorageFile): StorageFileView {
  return {
    id: file.id,
    name: file.originalName,
    mimeType: file.mimeType,
    size: file.fileSize,
    folderId: file.folderId,
    status: file.status,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

export function toFolderView(folder: StorageFolder): StorageFolderView {
  return {
    id: folder.id,
    parentId: folder.parentId,
    name: folder.name,
    path: folder.path,
    storageConfigId: folder.storageConfigId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

/** The only place a persisted config becomes client-visible. Credentials are never copied. */
export function toConfigurationView(config: StorageProviderConfig): StorageConfigurationView {
  return {
    id: config.id,
    provider: config.providerType,
    name: config.name,
    bucket: config.bucketName,
    region: config.region,
    endpoint: config.endpoint,
    basePath: config.basePath,
    hasCredentials: config.encryptedCredentials !== null,
    isDefault: config.isDefault,
    isActive: config.isActive,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}
