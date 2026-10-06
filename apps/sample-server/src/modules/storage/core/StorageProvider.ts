export interface CreateUploadUrlInput {
  readonly key: string;
  readonly contentType: string;
  readonly contentLength: number;
  readonly expiresInSeconds: number;
}

export interface UploadUrlResult {
  readonly url: string;
  readonly method: 'PUT';
  /** Headers the client MUST send with the upload request. */
  readonly headers: Record<string, string>;
  readonly expiresAt: string;
}

export interface CreateDownloadUrlInput {
  readonly key: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly disposition: 'attachment' | 'inline';
  readonly expiresInSeconds: number;
}

export interface DownloadUrlResult {
  readonly url: string;
  readonly expiresAt: string;
}

export interface ObjectRef {
  readonly key: string;
}

export interface ObjectMetadata {
  readonly size: number;
  readonly contentType: string | null;
  readonly etag: string | null;
}

/**
 * The only storage surface the rest of MAW is allowed to touch. Provider-specific logic
 * (SDKs, paths, signing) lives strictly inside implementations of this interface.
 * Keys are provider-relative; each provider applies its own base path.
 */
export interface StorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult>;
  createDownloadUrl(input: CreateDownloadUrlInput): Promise<DownloadUrlResult>;
  deleteObject(input: ObjectRef): Promise<void>;
  objectExists(input: ObjectRef): Promise<boolean>;
  /** Throws `STORAGE_OBJECT_NOT_FOUND` when the object does not exist. */
  getObjectMetadata(input: ObjectRef): Promise<ObjectMetadata>;
  /** Cheap reachability/permission probe used by "test configuration". Throws on failure. */
  verifyAccess(): Promise<void>;
}
