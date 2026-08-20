/**
 * File storage contract — abstracts where files are persisted.
 * Implementations: local filesystem, S3-compatible, cloud storage.
 */

export interface StoredFile {
  readonly key: string;
  readonly url: string;
  readonly size: number;
  readonly mimeType: string;
  readonly originalName: string;
  readonly createdAt: string;
  readonly metadata?: Record<string, string>;
}

export interface UploadRequest {
  readonly key: string;
  readonly mimeType: string;
  readonly size: number;
  readonly originalName: string;
  readonly metadata?: Record<string, string>;
}

export interface PresignedUpload {
  readonly url: string;
  readonly method: 'PUT' | 'POST';
  readonly headers: Record<string, string>;
  readonly key: string;
  readonly expiresAt: string;
}

export interface FileListOptions {
  readonly prefix?: string;
  readonly maxKeys?: number;
  readonly continuationToken?: string;
}

export interface FileListResult {
  readonly files: StoredFile[];
  readonly continuationToken?: string;
  readonly hasMore: boolean;
}

export interface IFileStorage {
  /** Upload a file from a Buffer/ReadableStream. */
  put(key: string, data: Buffer | ReadableStream | Uint8Array, opts: UploadRequest): Promise<StoredFile>;

  /** Get a public/signed URL for a stored file. */
  getUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /** Get file metadata without downloading. */
  head(key: string): Promise<StoredFile | null>;

  /** Delete a file. */
  delete(key: string): Promise<void>;

  /** List files with optional prefix filter. */
  list(options?: FileListOptions): Promise<FileListResult>;

  /** Generate a presigned upload URL (client uploads directly to storage). */
  createPresignedUpload?(request: UploadRequest, expiresInSeconds?: number): Promise<PresignedUpload>;
}
