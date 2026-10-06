export const STORAGE_PROVIDER_TYPES = ['local', 's3'] as const;
export type StorageProviderType = (typeof STORAGE_PROVIDER_TYPES)[number];

export const StorageFileStatus = {
  Pending: 'pending',
  Uploading: 'uploading',
  Uploaded: 'uploaded',
  Failed: 'failed',
  Deleted: 'deleted',
} as const;
export type StorageFileStatus = (typeof StorageFileStatus)[keyof typeof StorageFileStatus];

export type StorageVisibility = 'private';

export interface StorageCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

/** Persisted master row describing a supported provider. */
export interface StorageProviderRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly providerType: StorageProviderType;
  readonly isActive: boolean;
}

/** Persisted tenant configuration. `encryptedCredentials` must never leave the service layer. */
export interface StorageProviderConfig {
  readonly id: string;
  readonly tenantId: string;
  readonly providerId: string;
  readonly providerType: StorageProviderType;
  readonly name: string;
  readonly bucketName: string | null;
  readonly region: string | null;
  readonly endpoint: string | null;
  readonly basePath: string;
  readonly encryptedCredentials: string | null;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Safe, client-facing view of a configuration — no credentials. */
export interface StorageConfigurationView {
  readonly id: string;
  readonly provider: StorageProviderType;
  readonly name: string;
  readonly bucket: string | null;
  readonly region: string | null;
  readonly endpoint: string | null;
  readonly basePath: string;
  readonly hasCredentials: boolean;
  readonly isDefault: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StorageFolder {
  readonly id: string;
  readonly tenantId: string;
  readonly storageConfigId: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly path: string;
  readonly createdBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface StorageFile {
  readonly id: string;
  readonly tenantId: string;
  readonly storageConfigId: string;
  readonly folderId: string | null;
  readonly originalName: string;
  readonly objectKey: string;
  readonly mimeType: string;
  readonly extension: string;
  readonly fileSize: number;
  readonly checksum: string | null;
  readonly status: StorageFileStatus;
  readonly visibility: StorageVisibility;
  readonly uploadedBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

export interface StorageFileVersion {
  readonly id: string;
  readonly fileId: string;
  readonly versionNumber: number;
  readonly objectKey: string;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly checksum: string | null;
  readonly createdBy: string | null;
  readonly createdAt: string;
}

export interface StorageAttachment {
  readonly id: string;
  readonly tenantId: string;
  readonly fileId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly category: string;
  readonly createdBy: string | null;
  readonly createdAt: string;
}

// --- Request / response contracts -------------------------------------------------

export interface CreateUploadRequest {
  readonly folderId?: string | null;
  readonly fileName: string;
  readonly contentType: string;
  readonly fileSize: number;
}

export interface CreateUploadResponse {
  readonly fileId: string;
  readonly uploadUrl: string;
  readonly method: 'PUT';
  readonly headers: Record<string, string>;
  readonly expiresIn: number;
}

export interface DownloadUrlResponse {
  readonly url: string;
  readonly expiresIn: number;
}

export interface StorageFileView {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly folderId: string | null;
  readonly status: StorageFileStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StorageFolderView {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly path: string;
  readonly storageConfigId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateConfigurationInput {
  readonly provider: StorageProviderType;
  readonly name: string;
  readonly bucket?: string | null;
  readonly region?: string | null;
  readonly endpoint?: string | null;
  readonly basePath?: string | null;
  readonly credentials?: StorageCredentials | null;
  readonly isDefault?: boolean;
}

export interface UpdateConfigurationInput {
  readonly name?: string;
  readonly bucket?: string | null;
  readonly region?: string | null;
  readonly endpoint?: string | null;
  readonly basePath?: string | null;
  /** Omitted ⇒ keep existing credentials. */
  readonly credentials?: StorageCredentials;
  readonly isDefault?: boolean;
  readonly isActive?: boolean;
}

export interface PageRequest {
  readonly page: number;
  readonly pageSize: number;
}

export interface PageResult<T> {
  readonly items: T[];
  readonly total: number;
}

export type SortDirection = 'asc' | 'desc';
