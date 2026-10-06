import { ValidationError } from '@mawsoftwares/sdk/kernel/errors';
import { sanitizeFilename } from '@mawsoftwares/sdk/kernel/file';
import type { FieldError } from '@mawsoftwares/sdk/kernel/validate';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type StorageLimits } from '../core/storage.constants';
import {
  STORAGE_PROVIDER_TYPES,
  type CreateConfigurationInput,
  type CreateUploadRequest,
  type SortDirection,
  type StorageCredentials,
  type StorageProviderType,
  type UpdateConfigurationInput,
} from '../types/storage.types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const ENTITY_TOKEN = /^[A-Za-z0-9_.:-]{1,128}$/;

type Raw = Record<string, unknown>;

class Collector {
  readonly errors: FieldError[] = [];
  add(field: string, error: string): void {
    this.errors.push({ field, error });
  }
  done(): void {
    if (this.errors.length > 0) throw new ValidationError(this.errors);
  }
}

function asObject(body: unknown): Raw {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError([{ field: 'body', error: 'Request body must be a JSON object' }]);
  }
  return body as Raw;
}

function str(raw: Raw, field: string, c: Collector, opts: { required?: boolean; max: number }): string | undefined {
  const value = raw[field];
  if (value === undefined || value === null) {
    if (opts.required) c.add(field, 'is required');
    return undefined;
  }
  if (typeof value !== 'string') {
    c.add(field, 'must be a string');
    return undefined;
  }
  const trimmed = value.trim();
  if (opts.required && trimmed.length === 0) c.add(field, 'is required');
  if (trimmed.length > opts.max) c.add(field, `must be at most ${opts.max} characters`);
  return trimmed;
}

export function parseUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new ValidationError([{ field, error: 'must be a valid UUID' }]);
  }
  return value.toLowerCase();
}

function optionalUuid(raw: Raw, field: string, c: Collector): string | null | undefined {
  const value = raw[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !UUID.test(value)) {
    c.add(field, 'must be a valid UUID or null');
    return undefined;
  }
  return value.toLowerCase();
}

function mimeAllowed(contentType: string, allowed: readonly string[]): boolean {
  if (allowed.length === 0) return true;
  return allowed.some((rule) => (rule.endsWith('/*') ? contentType.startsWith(rule.slice(0, -1)) : contentType === rule));
}

export function validateCreateUpload(body: unknown, limits: StorageLimits): CreateUploadRequest {
  const raw = asObject(body);
  const c = new Collector();
  const folderId = optionalUuid(raw, 'folderId', c);
  const rawName = str(raw, 'fileName', c, { required: true, max: 255 });
  const contentType = str(raw, 'contentType', c, { required: true, max: 255 })?.toLowerCase();
  const fileSize = raw['fileSize'];

  let fileName = '';
  if (rawName) {
    fileName = sanitizeFilename(rawName);
    if (fileName.replace(/[._\s]/g, '').length === 0) c.add('fileName', 'is not a valid file name');
  }
  if (contentType) {
    if (!MIME.test(contentType)) c.add('contentType', 'must be a valid MIME type');
    else if (!mimeAllowed(contentType, limits.allowedMimeTypes)) c.add('contentType', 'file type is not allowed');
  }
  if (typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize < 1) {
    c.add('fileSize', 'must be a positive integer (bytes)');
  } else if (fileSize > limits.maxFileSizeBytes) {
    c.add('fileSize', `must not exceed ${limits.maxFileSizeBytes} bytes`);
  }
  c.done();
  return { folderId: folderId ?? null, fileName, contentType: contentType!, fileSize: fileSize as number };
}

const FOLDER_NAME_FORBIDDEN = /[/\\\x00-\x1f]/;

function folderName(raw: Raw, c: Collector, required: boolean): string | undefined {
  const name = str(raw, 'name', c, { required, max: 255 });
  if (name !== undefined && name.length > 0) {
    if (FOLDER_NAME_FORBIDDEN.test(name)) c.add('name', 'must not contain slashes or control characters');
    else if (name === '.' || name === '..') c.add('name', 'is not a valid folder name');
  }
  return name;
}

export function validateCreateFolder(body: unknown): { name: string; parentId: string | null; storageConfigId?: string } {
  const raw = asObject(body);
  const c = new Collector();
  const name = folderName(raw, c, true);
  const parentId = optionalUuid(raw, 'parentId', c);
  const storageConfigId = optionalUuid(raw, 'storageConfigId', c);
  c.done();
  return { name: name!, parentId: parentId ?? null, ...(storageConfigId ? { storageConfigId } : {}) };
}

export function validateUpdateFolder(body: unknown): { name?: string; parentId?: string | null } {
  const raw = asObject(body);
  const c = new Collector();
  const name = folderName(raw, c, false);
  const parentId = optionalUuid(raw, 'parentId', c);
  if (name === undefined && parentId === undefined) c.add('body', 'provide name and/or parentId');
  c.done();
  return { ...(name !== undefined ? { name } : {}), ...(parentId !== undefined ? { parentId } : {}) };
}

function credentials(raw: Raw, c: Collector): StorageCredentials | undefined {
  const value = raw['credentials'];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    c.add('credentials', 'must be an object');
    return undefined;
  }
  const inner = value as Raw;
  const accessKeyId = str(inner, 'accessKeyId', c, { required: true, max: 256 });
  const secretAccessKey = str(inner, 'secretAccessKey', c, { required: true, max: 512 });
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
}

function endpointOrNull(raw: Raw, c: Collector): string | null | undefined {
  const endpoint = str(raw, 'endpoint', c, { max: 512 });
  if (endpoint === undefined) return raw['endpoint'] === null ? null : undefined;
  if (endpoint === '') return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocol');
  } catch {
    c.add('endpoint', 'must be an http(s) URL');
  }
  return endpoint;
}

function nullable(value: string | undefined, raw: Raw, field: string): string | null | undefined {
  if (value === undefined) return raw[field] === null ? null : undefined;
  return value === '' ? null : value;
}

export function validateCreateConfiguration(body: unknown): CreateConfigurationInput {
  const raw = asObject(body);
  const c = new Collector();
  const provider = raw['provider'];
  if (typeof provider !== 'string' || !(STORAGE_PROVIDER_TYPES as readonly string[]).includes(provider)) {
    c.add('provider', `must be one of: ${STORAGE_PROVIDER_TYPES.join(', ')}`);
  }
  const name = str(raw, 'name', c, { required: true, max: 128 });
  const bucket = nullable(str(raw, 'bucket', c, { max: 255 }), raw, 'bucket');
  const region = nullable(str(raw, 'region', c, { max: 64 }), raw, 'region');
  const basePath = nullable(str(raw, 'basePath', c, { max: 255 }), raw, 'basePath');
  const endpoint = endpointOrNull(raw, c);
  const creds = credentials(raw, c);
  const isDefault = raw['isDefault'];
  if (isDefault !== undefined && typeof isDefault !== 'boolean') c.add('isDefault', 'must be a boolean');
  const accountId = nullable(str(raw, 'accountId', c, { max: 64 }), raw, 'accountId');
  c.done();
  // Which settings each provider requires is the provider's own business (its descriptor); the service enforces it.
  return {
    provider: provider as StorageProviderType,
    name: name!,
    bucket,
    region,
    endpoint,
    accountId,
    basePath,
    credentials: creds ?? null,
    isDefault: isDefault === true,
  };
}

export function validateUpdateConfiguration(body: unknown): UpdateConfigurationInput {
  const raw = asObject(body);
  const c = new Collector();
  const name = str(raw, 'name', c, { max: 128 });
  if (raw['name'] !== undefined && !name) c.add('name', 'must not be empty');
  const bucket = nullable(str(raw, 'bucket', c, { max: 255 }), raw, 'bucket');
  const region = nullable(str(raw, 'region', c, { max: 64 }), raw, 'region');
  const basePath = nullable(str(raw, 'basePath', c, { max: 255 }), raw, 'basePath');
  const endpoint = endpointOrNull(raw, c);
  const accountId = nullable(str(raw, 'accountId', c, { max: 64 }), raw, 'accountId');
  const creds = credentials(raw, c);
  for (const flag of ['isDefault', 'isActive'] as const) {
    if (raw[flag] !== undefined && typeof raw[flag] !== 'boolean') c.add(flag, 'must be a boolean');
  }
  c.done();
  return {
    ...(name !== undefined ? { name } : {}),
    ...(bucket !== undefined ? { bucket } : {}),
    ...(region !== undefined ? { region } : {}),
    ...(basePath !== undefined ? { basePath } : {}),
    ...(endpoint !== undefined ? { endpoint } : {}),
    ...(accountId !== undefined ? { accountId } : {}),
    ...(creds ? { credentials: creds } : {}),
    ...(raw['isDefault'] !== undefined ? { isDefault: raw['isDefault'] as boolean } : {}),
    ...(raw['isActive'] !== undefined ? { isActive: raw['isActive'] as boolean } : {}),
  };
}

export function validateCreateAttachment(body: unknown): {
  fileId: string;
  entityType: string;
  entityId: string;
  category: string;
} {
  const raw = asObject(body);
  const c = new Collector();
  let fileId = '';
  if (typeof raw['fileId'] === 'string' && UUID.test(raw['fileId'])) fileId = raw['fileId'].toLowerCase();
  else c.add('fileId', 'must be a valid UUID');
  const entityType = str(raw, 'entityType', c, { required: true, max: 64 });
  const entityId = str(raw, 'entityId', c, { required: true, max: 128 });
  const category = str(raw, 'category', c, { max: 64 }) || 'general';
  for (const [field, value] of [['entityType', entityType], ['entityId', entityId], ['category', category]] as const) {
    if (value && !ENTITY_TOKEN.test(value)) c.add(field, 'may only contain letters, digits and _ . : -');
  }
  c.done();
  return { fileId, entityType: entityType!, entityId: entityId!, category };
}

export function validateEntityQuery(query: Record<string, string | string[] | undefined>): {
  entityType: string;
  entityId: string;
  category?: string;
} {
  const c = new Collector();
  const read = (field: string, required: boolean): string | undefined => {
    const v = first(query[field]);
    if (!v && required) c.add(field, 'is required');
    else if (v && !ENTITY_TOKEN.test(v)) c.add(field, 'may only contain letters, digits and _ . : -');
    return v;
  };
  const entityType = read('entityType', true);
  const entityId = read('entityId', true);
  const category = read('category', false);
  c.done();
  return { entityType: entityType!, entityId: entityId!, ...(category ? { category } : {}) };
}

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined || v === '' ? undefined : v;
}

export interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
}

export function parseListQuery(query: Record<string, string | string[] | undefined>): ListQuery {
  const page = Number.parseInt(first(query['page']) ?? '1', 10);
  const pageSize = Number.parseInt(first(query['pageSize']) ?? String(DEFAULT_PAGE_SIZE), 10);
  const search = first(query['search'])?.slice(0, 100);
  const sortBy = first(query['sortBy']);
  const dir = first(query['sortDir'])?.toLowerCase();
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(dir === 'asc' || dir === 'desc' ? { sortDir: dir } : {}),
  };
}

/** `root` (or absent) ⇒ null; otherwise a UUID. */
export function parseParentRef(value: string | string[] | undefined, field: string): string | null {
  const v = first(value);
  return v === undefined || v === 'root' ? null : parseUuid(v, field);
}

export function parseDisposition(value: string | string[] | undefined): 'attachment' | 'inline' {
  const v = first(value);
  if (v === undefined) return 'attachment';
  if (v === 'attachment' || v === 'inline') return v;
  throw new ValidationError([{ field: 'disposition', error: 'must be "attachment" or "inline"' }]);
}
