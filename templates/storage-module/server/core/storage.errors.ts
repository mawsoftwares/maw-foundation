import { AppError, ErrorCode, type ErrorCodeValue } from '@mawsoftwares/sdk/kernel/errors';

/**
 * Storage-specific reasons. The SDK `ErrorCode` union is shared by every product (and the
 * PHP contract), so storage errors use a standard code + status and expose the precise
 * reason as `details.reason`.
 */
export const StorageErrorReason = {
  ProviderNotFound: 'STORAGE_PROVIDER_NOT_FOUND',
  ConfigurationNotFound: 'STORAGE_CONFIGURATION_NOT_FOUND',
  FolderNotFound: 'STORAGE_FOLDER_NOT_FOUND',
  FileNotFound: 'STORAGE_FILE_NOT_FOUND',
  AccessDenied: 'STORAGE_ACCESS_DENIED',
  UploadFailed: 'STORAGE_UPLOAD_FAILED',
  UploadNotCompleted: 'STORAGE_UPLOAD_NOT_COMPLETED',
  ObjectNotFound: 'STORAGE_OBJECT_NOT_FOUND',
  ProviderError: 'STORAGE_PROVIDER_ERROR',
  InvalidFile: 'STORAGE_INVALID_FILE',
  InvalidInput: 'STORAGE_INVALID_INPUT',
  Conflict: 'STORAGE_CONFLICT',
} as const;
export type StorageErrorReasonValue = (typeof StorageErrorReason)[keyof typeof StorageErrorReason];

export class StorageError extends AppError {
  readonly reason: StorageErrorReasonValue;

  constructor(
    reason: StorageErrorReasonValue,
    code: ErrorCodeValue,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, undefined, { ...details, reason });
    this.name = 'StorageError';
    this.reason = reason;
  }
}

const notFound = (reason: StorageErrorReasonValue, message: string): StorageError =>
  new StorageError(reason, ErrorCode.NOT_FOUND, message);

export const storageErrors = {
  providerNotFound: (type: string) =>
    new StorageError(StorageErrorReason.ProviderNotFound, ErrorCode.INVALID_INPUT, `Unsupported storage provider "${type}"`),
  configurationNotFound: () => notFound(StorageErrorReason.ConfigurationNotFound, 'Storage configuration not found'),
  folderNotFound: () => notFound(StorageErrorReason.FolderNotFound, 'Folder not found'),
  fileNotFound: () => notFound(StorageErrorReason.FileNotFound, 'File not found'),
  objectNotFound: () => notFound(StorageErrorReason.ObjectNotFound, 'Stored object not found'),
  accessDenied: () =>
    new StorageError(StorageErrorReason.AccessDenied, ErrorCode.FORBIDDEN, 'Access to this storage resource is denied'),
  invalidFile: (message: string) =>
    new StorageError(StorageErrorReason.InvalidFile, ErrorCode.VALIDATION_FAILED, message),
  invalidInput: (message: string) =>
    new StorageError(StorageErrorReason.InvalidInput, ErrorCode.VALIDATION_FAILED, message),
  conflict: (message: string) => new StorageError(StorageErrorReason.Conflict, ErrorCode.CONFLICT, message),
  uploadNotCompleted: (message: string) =>
    new StorageError(StorageErrorReason.UploadNotCompleted, ErrorCode.CONFLICT, message),
  uploadFailed: (message: string) =>
    new StorageError(StorageErrorReason.UploadFailed, ErrorCode.CONFLICT, message),
  /** Never include provider response bodies, hosts or credentials in `message`. */
  providerError: (message = 'The storage provider could not complete the request') =>
    new StorageError(StorageErrorReason.ProviderError, ErrorCode.SERVICE_UNAVAILABLE, message),
} as const;
