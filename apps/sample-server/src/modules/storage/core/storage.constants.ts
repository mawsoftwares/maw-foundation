export const STORAGE_ROUTE_PREFIX = '/api/v1/storage';
export const STORAGE_LOCAL_GATEWAY_PATH = `${STORAGE_ROUTE_PREFIX}/local`;

export const STORAGE_PERMISSIONS = {
  view: 'Read_Storage',
  upload: 'Upload_Storage',
  download: 'Download_Storage',
  createFolder: 'Create_StorageFolders',
  updateFolder: 'Update_StorageFolders',
  deleteFolder: 'Delete_StorageFolders',
  deleteFile: 'Delete_StorageFiles',
  manageConfiguration: 'Manage_StorageConfiguration',
} as const;

export interface StorageLimits {
  readonly uploadUrlTtlSeconds: number;
  readonly downloadUrlTtlSeconds: number;
  readonly maxFileSizeBytes: number;
  /** Exact types (`application/pdf`) or wildcards (`image/*`). Empty ⇒ any well-formed type. */
  readonly allowedMimeTypes: readonly string[];
}

export const DEFAULT_STORAGE_LIMITS: StorageLimits = {
  uploadUrlTtlSeconds: 15 * 60,
  downloadUrlTtlSeconds: 5 * 60,
  maxFileSizeBytes: 100 * 1024 * 1024,
  allowedMimeTypes: [],
};

export const MAX_FOLDER_DEPTH = 32;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
