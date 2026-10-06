import { DEFAULT_STORAGE_LIMITS, type StorageLimits } from './storage.constants';

export interface StorageModuleConfig {
  readonly localRoot: string;
  readonly localSigningSecret: string;
  /** Public origin of this server, used to build local signed URLs. */
  readonly publicBaseUrl: string;
  readonly limits: StorageLimits;
}

type EnvReader = (name: string) => string | undefined;

function intFrom(read: EnvReader, name: string, fallback: number): number {
  const value = Number.parseInt(read(name) ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Reads storage settings from the environment:
 *   STORAGE_LOCAL_ROOT, STORAGE_LOCAL_SIGNING_SECRET, STORAGE_UPLOAD_URL_TTL_SECONDS,
 *   STORAGE_DOWNLOAD_URL_TTL_SECONDS, STORAGE_MAX_FILE_SIZE_BYTES, STORAGE_ALLOWED_MIME_TYPES (comma list)
 */
export function loadStorageConfig(
  read: EnvReader,
  defaults: { signingSecretFallback: string; publicBaseUrl: string },
): StorageModuleConfig {
  const allowed = (read('STORAGE_ALLOWED_MIME_TYPES') ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return {
    localRoot: read('STORAGE_LOCAL_ROOT') ?? './storage',
    localSigningSecret: read('STORAGE_LOCAL_SIGNING_SECRET') ?? defaults.signingSecretFallback,
    publicBaseUrl: defaults.publicBaseUrl,
    limits: {
      uploadUrlTtlSeconds: intFrom(read, 'STORAGE_UPLOAD_URL_TTL_SECONDS', DEFAULT_STORAGE_LIMITS.uploadUrlTtlSeconds),
      downloadUrlTtlSeconds: intFrom(read, 'STORAGE_DOWNLOAD_URL_TTL_SECONDS', DEFAULT_STORAGE_LIMITS.downloadUrlTtlSeconds),
      maxFileSizeBytes: intFrom(read, 'STORAGE_MAX_FILE_SIZE_BYTES', DEFAULT_STORAGE_LIMITS.maxFileSizeBytes),
      allowedMimeTypes: allowed,
    },
  };
}
