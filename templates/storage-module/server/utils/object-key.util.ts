import { storageErrors } from '../core/storage.errors';

const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;
const ROOT_FOLDER_SEGMENT = 'root';

function safeSegment(value: string, label: string): string {
  if (!SAFE_SEGMENT.test(value)) throw storageErrors.invalidInput(`Unsafe ${label} for object key`);
  return value;
}

export interface ObjectKeyInput {
  readonly tenantId: string;
  readonly folderId: string | null;
  readonly fileId: string;
}

/**
 * `tenant/{tenantId}/folder/{folderId|root}/file/{fileId}/original`
 * Built only from validated identifiers — the original filename is never part of the key.
 */
export function buildObjectKey({ tenantId, folderId, fileId }: ObjectKeyInput): string {
  const folder = folderId === null ? ROOT_FOLDER_SEGMENT : safeSegment(folderId, 'folder id');
  return `tenant/${safeSegment(tenantId, 'tenant id')}/folder/${folder}/file/${safeSegment(fileId, 'file id')}/original`;
}

const KEY_PATTERN = /^[A-Za-z0-9_\-/]+$/;

/** Defence in depth for provider implementations: reject anything that could escape a root. */
export function assertSafeObjectKey(key: string): string {
  if (
    key.length === 0 ||
    key.length > 1024 ||
    key.startsWith('/') ||
    !KEY_PATTERN.test(key) ||
    key.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw storageErrors.invalidInput('Invalid object key');
  }
  return key;
}

/** Normalises an admin-supplied base path (`a/b`) and rejects traversal. */
export function normalizeBasePath(basePath: string | null | undefined): string {
  const trimmed = (basePath ?? '').trim().replace(/^\/+|\/+$/g, '');
  if (trimmed.length === 0) return '';
  if (trimmed.length > 255 || !/^[A-Za-z0-9_\-./]+$/.test(trimmed) || trimmed.split('/').some((s) => s === '' || s === '.' || s === '..')) {
    throw storageErrors.invalidInput('Invalid base path');
  }
  return trimmed;
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0 || dot === fileName.length - 1) return '';
  return fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);
}
