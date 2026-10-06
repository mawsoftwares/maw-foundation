/**
 * Keeps the Node implementation and `contracts/openapi/storage.yaml` from drifting apart.
 * (The PHP backend must satisfy the same contract; see contracts/README.md.)
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { RequestHandler } from 'express';
import { describe, expect, it } from 'vitest';
import { routeRegistry } from '@mawsoftwares/api';
import { createStorageModule } from '../index';
import { STORAGE_PERMISSIONS, STORAGE_ROUTE_PREFIX } from '../core/storage.constants';
import { StorageErrorReason } from '../core/storage.errors';
import { STORAGE_PROVIDER_TYPES } from '../types/storage.types';
import { StorageFileStatus } from '../types/storage.types';
import { STORAGE_ERROR_REASONS, STORAGE_FILE_STATUSES } from '../../../../../../contracts/verification/response-schemas';

const spec = readFileSync(path.resolve(__dirname, '../../../../../../contracts/openapi/storage.yaml'), 'utf8');

/** `METHOD /path` for every operation documented under `paths:` (path params as `{id}`). */
function specOperations(): string[] {
  const ops: string[] = [];
  let current: string | null = null;
  let inPaths = false;
  for (const line of spec.split('\n')) {
    if (/^paths:/.test(line)) inPaths = true;
    else if (/^components:/.test(line)) inPaths = false;
    if (!inPaths) continue;
    const p = /^ {2}(\/\S+):\s*$/.exec(line);
    if (p) current = p[1]!;
    const m = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (m && current) ops.push(`${m[1]!.toUpperCase()} ${current}`);
  }
  return ops;
}

/** Values of the first `enum:` that follows `marker` (inline `[a, b]` or a block list). */
function enumAfter(marker: string): string[] {
  const rest = spec.slice(spec.indexOf(marker));
  const at = rest.indexOf('enum:');
  const after = rest.slice(at + 'enum:'.length);
  const inline = /^\s*\[([^\]]+)\]/.exec(after);
  if (inline) return inline[1]!.split(',').map((v) => v.trim());
  const values: string[] = [];
  for (const line of after.split('\n').slice(1)) {
    const item = /^\s+- (\S+)\s*$/.exec(line);
    if (!item) break;
    values.push(item[1]!);
  }
  return values;
}

describe('storage contract ↔ Node implementation', () => {
  const noop: RequestHandler = (_req, _res, next) => next();
  createStorageModule({
    pool: { query: async () => ({ rows: [], rowCount: 0 }) },
    encryption: { encrypt: async (s) => s, decrypt: async (s) => s, generateKey: async () => 'k' },
    config: {
      localRoot: '/tmp/maw-contract-test',
      localSigningSecret: 'contract-test-secret-123456',
      publicBaseUrl: 'http://localhost',
      limits: { uploadUrlTtlSeconds: 900, downloadUrlTtlSeconds: 300, maxFileSizeBytes: 1000, allowedMimeTypes: [] },
    },
    requireAuth: noop,
    requirePermission: () => noop,
  });

  const nodeOperations = routeRegistry
    .getAll()
    .filter((r) => r.path.startsWith(STORAGE_ROUTE_PREFIX) && r.metadata.tags?.includes('storage'))
    .map((r) => `${r.method} ${r.path.replace(/:([A-Za-z]+)/g, '{$1}')}`);

  // The local gateway is a plain Express router (raw streaming), so it is documented but not in the registry.
  const gatewayOperations = ['PUT /api/v1/storage/local/{token}', 'GET /api/v1/storage/local/{token}'];

  it('documents every route the Node API serves', () => {
    expect(nodeOperations.length).toBeGreaterThan(15);
    const documented = new Set(specOperations());
    expect(nodeOperations.filter((op) => !documented.has(op))).toEqual([]);
  });

  it('does not document routes the Node API lacks', () => {
    const served = new Set([...nodeOperations, ...gatewayOperations]);
    expect(specOperations().filter((op) => !served.has(op))).toEqual([]);
  });

  it('lists every permission used by the module', () => {
    for (const permission of Object.values(STORAGE_PERMISSIONS)) {
      expect(spec, permission).toContain(`x-required-permission: ${permission}`);
    }
  });

  it('uses exactly the error reasons implemented', () => {
    expect(new Set(enumAfter('StorageErrorReason:'))).toEqual(new Set(Object.values(StorageErrorReason)));
    expect(new Set(STORAGE_ERROR_REASONS)).toEqual(new Set(Object.values(StorageErrorReason)));
  });

  it('uses exactly the file statuses implemented', () => {
    expect(new Set(enumAfter('StorageFileStatus:'))).toEqual(new Set(Object.values(StorageFileStatus)));
    expect(new Set(STORAGE_FILE_STATUSES)).toEqual(new Set(Object.values(StorageFileStatus)));
  });

  it('accepts exactly the providers implemented when creating a configuration', () => {
    expect(new Set(enumAfter('CreateStorageConfigurationRequest:'))).toEqual(new Set(STORAGE_PROVIDER_TYPES));
  });
});
