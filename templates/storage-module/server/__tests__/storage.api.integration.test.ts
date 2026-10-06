/**
 * End-to-end: real Postgres repositories + real services + real Express routes + the local
 * provider's signed-URL gateway, over real HTTP. Runs only when STORAGE_TEST_DATABASE_URL points
 * at a Postgres server (a throwaway schema is created and dropped); skipped otherwise.
 *
 *   STORAGE_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/scratch pnpm test:integration
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { populateRequestContext } from '@mawsoftwares/server-express';
import { createGlobalErrorHandler } from '@mawsoftwares/server-express/error-handler';
import { AesEncryptionService } from '@mawsoftwares/platform/security/AesEncryptionService';
import { createStorageModule } from '../index';
import { STORAGE_LOCAL_GATEWAY_PATH, STORAGE_ROUTE_PREFIX } from '../core/storage.constants';

const DATABASE_URL = process.env['STORAGE_TEST_DATABASE_URL'];
const MIGRATION = path.resolve(__dirname, '../../../../migrations/029_storage.up.sql');

interface Envelope<T = Record<string, unknown>> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: { reason?: string } };
}

describe.skipIf(!DATABASE_URL)('MAW Storage API (integration)', () => {
  const schema = `storage_it_${randomBytes(4).toString('hex')}`;
  let pool: pg.Pool;
  let server: Server;
  let origin: string;
  let root: string;

  const ALL = ['Read_Storage', 'Upload_Storage', 'Download_Storage', 'Create_StorageFolders', 'Update_StorageFolders', 'Delete_StorageFolders', 'Delete_StorageFiles', 'Manage_StorageConfiguration'];

  /** Test double for the platform auth: identity + permissions come from headers. */
  const requireAuth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.header('x-test-tenant');
    if (!tenantId) return void res.status(401).json({ error: 'unauthenticated' });
    (req as unknown as { maw: unknown }).maw = { claims: { tenantId, userId: req.header('x-test-user') ?? 'u1' } };
    next();
  };
  const requirePermission = (perm: string): RequestHandler => (req, res, next) =>
    (req.header('x-test-perms') ?? ALL.join(',')).split(',').includes(perm) ? next() : void res.status(403).json({ error: 'forbidden' });

  async function call<T = Record<string, unknown>>(
    method: string,
    url: string,
    opts: { tenant?: string; perms?: string[]; body?: unknown } = {},
  ): Promise<{ status: number; json: Envelope<T> }> {
    const res = await fetch(`${origin}${STORAGE_ROUTE_PREFIX}${url}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-test-tenant': opts.tenant ?? 'tenant-a',
        ...(opts.perms ? { 'x-test-perms': opts.perms.join(',') } : {}),
      },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
    const text = await res.text();
    return { status: res.status, json: (text ? JSON.parse(text) : {}) as Envelope<T> };
  }

  beforeAll(async () => {
    const admin = new pg.Pool({ connectionString: DATABASE_URL });
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: DATABASE_URL, options: `-c search_path=${schema}` });
    await pool.query(await readFile(MIGRATION, 'utf8'));

    root = await mkdtemp(path.join(os.tmpdir(), 'maw-storage-it-'));
    const app = express();
    // Same ordering as sample-server/main.ts: JSON parser skips the gateway, gateway before the API.
    const json = express.json();
    app.use((req, res, next) => (req.path.startsWith(`${STORAGE_LOCAL_GATEWAY_PATH}/`) ? next() : json(req, res, next)));
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    const storage = createStorageModule({
      pool,
      encryption: new AesEncryptionService('22'.repeat(32)),
      config: {
        localRoot: root,
        localSigningSecret: 'integration-signing-secret-123',
        publicBaseUrl: origin,
        limits: { uploadUrlTtlSeconds: 900, downloadUrlTtlSeconds: 300, maxFileSizeBytes: 1_000_000, allowedMimeTypes: [] },
      },
      requireAuth,
      requirePermission,
    });
    app.use(STORAGE_LOCAL_GATEWAY_PATH, storage.localGatewayRouter);
    app.use(populateRequestContext());
    app.use(STORAGE_ROUTE_PREFIX, storage.router);
    app.use(createGlobalErrorHandler({ logger: { error: () => undefined } }));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    await pool?.end();
    const admin = new pg.Pool({ connectionString: DATABASE_URL });
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
    await rm(root, { recursive: true, force: true });
  });

  let configA: string;
  let configB: string;

  it('configures per-tenant storage; first config becomes default; secrets never come back', async () => {
    const a = await call<{ id: string; isDefault: boolean }>('POST', '/configurations', { body: { provider: 'local', name: 'Local A', basePath: 'a-files' } });
    expect(a.status).toBe(201);
    expect(a.json.data).toMatchObject({ provider: 'local', isDefault: true, basePath: 'a-files' });
    configA = a.json.data!.id;

    const b = await call<{ id: string }>('POST', '/configurations', { tenant: 'tenant-b', body: { provider: 'local', name: 'Local B' } });
    configB = b.json.data!.id;

    const s3 = await call('POST', '/configurations', {
      body: { provider: 's3', name: 'S3', bucket: 'bkt', region: 'us-east-1', credentials: { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'topsecretvalue1234' } },
    });
    expect(s3.status).toBe(201);
    const listed = await call('GET', '/configurations');
    const raw = JSON.stringify(listed.json);
    expect(raw).not.toMatch(/topsecretvalue1234|AKIAIOSFODNN7EXAMPLE|encrypted|secretAccessKey/);
    const stored = await pool.query<{ encrypted_credentials: string }>(`SELECT encrypted_credentials FROM maw_storage_provider_configs WHERE name = 'S3'`);
    expect(stored.rows[0]!.encrypted_credentials).toMatch(/^v1:/);
    expect(stored.rows[0]!.encrypted_credentials).not.toContain('topsecretvalue1234');

    const probe = await call<{ ok: boolean }>('POST', `/configurations/${configA}/test`);
    expect(probe.json.data?.ok).toBe(true);
  });

  it('rejects invalid configuration and folder bodies', async () => {
    expect((await call('POST', '/configurations', { body: { provider: 's3', name: 'x' } })).status).toBe(400);
    expect((await call('POST', '/configurations', { body: { provider: 'ftp', name: 'x' } })).status).toBe(400);
    expect((await call('POST', '/folders', { body: { name: 'a/b' } })).status).toBe(400);
  });

  let folderId: string;

  it('manages nested folders with materialised paths, uniqueness and cycle protection', async () => {
    const root1 = await call<{ id: string; path: string }>('POST', '/folders', { body: { name: 'Documents' } });
    expect(root1.status).toBe(201);
    folderId = root1.json.data!.id;
    const child = await call<{ id: string; path: string }>('POST', '/folders', { body: { name: 'Invoices', parentId: folderId } });
    expect(child.json.data!.path).toBe('/Documents/Invoices');

    expect((await call('POST', '/folders', { body: { name: 'documents' } })).status).toBe(409); // case-insensitive duplicate
    expect((await call('PATCH', `/folders/${folderId}`, { body: { parentId: child.json.data!.id } })).status).toBe(409); // cycle

    expect((await call('PATCH', `/folders/${folderId}`, { body: { name: 'Docs' } })).status).toBe(200);
    const rows = await pool.query<{ path: string }>(`SELECT path FROM maw_storage_folders WHERE id = $1`, [child.json.data!.id]);
    expect(rows.rows[0]!.path).toBe('/Docs/Invoices');

    const list = await call<unknown[]>('GET', '/folders');
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.json)).toContain('Docs');
    expect((await call('DELETE', `/folders/${folderId}`)).status).toBe(409); // not empty
  });

  it('runs the full direct-upload lifecycle against the local provider', async () => {
    const content = Buffer.from('%PDF-1.4 integration test document');
    const up = await call<{ fileId: string; uploadUrl: string; method: string; headers: Record<string, string>; expiresIn: number }>('POST', '/uploads', {
      body: { folderId, fileName: 'Invoice 001.pdf', contentType: 'application/pdf', fileSize: content.length },
    });
    expect(up.status).toBe(201);
    const { fileId, uploadUrl, method, headers } = up.json.data!;
    expect(method).toBe('PUT');
    expect(uploadUrl.startsWith(`${origin}${STORAGE_LOCAL_GATEWAY_PATH}/`)).toBe(true);
    expect(uploadUrl).not.toContain(root);

    // Not uploaded yet: completion is refused, record stays pending, download refused.
    const early = await call('POST', `/uploads/${fileId}/complete`);
    expect(early.status).toBe(409);
    expect(early.json.error?.details?.reason).toBe('STORAGE_UPLOAD_NOT_COMPLETED');
    expect((await call('GET', `/files/${fileId}/download-url`)).status).toBe(409);

    // Client uploads directly (no MAW auth, just the signed URL).
    const put = await fetch(uploadUrl, { method, headers, body: new Uint8Array(content) });
    expect(put.status).toBe(200);

    const done = await call<{ status: string; name: string; size: number }>('POST', `/uploads/${fileId}/complete`);
    expect(done.status).toBe(200);
    expect(done.json.data).toMatchObject({ status: 'uploaded', name: 'Invoice 001.pdf', size: content.length });

    const key = (await pool.query<{ object_key: string }>(`SELECT object_key FROM maw_storage_files WHERE id = $1`, [fileId])).rows[0]!.object_key;
    expect(key).toBe(`tenant/tenant-a/folder/${folderId}/file/${fileId}/original`);
    expect((await pool.query(`SELECT 1 FROM maw_storage_file_versions WHERE file_id = $1 AND version_number = 1`, [fileId])).rowCount).toBe(1);

    const meta = await call<Record<string, unknown>>('GET', `/files/${fileId}`);
    expect(Object.keys(meta.json.data!).sort()).toEqual(['createdAt', 'folderId', 'id', 'mimeType', 'name', 'size', 'status', 'updatedAt']);

    const dl = await call<{ url: string; expiresIn: number }>('GET', `/files/${fileId}/download-url`);
    expect(dl.json.data!.expiresIn).toBe(300);
    const got = await fetch(dl.json.data!.url);
    expect(Buffer.from(await got.arrayBuffer()).equals(content)).toBe(true);
    expect(got.headers.get('content-disposition')).toContain('Invoice%20001.pdf');

    const files = await call<unknown[]>('GET', `/folders/${folderId}/files?search=invoice`);
    expect(JSON.stringify(files.json)).toContain(fileId);

    // Attach to a generic entity.
    const att = await call('POST', '/attachments', { body: { fileId, entityType: 'invoice', entityId: '123', category: 'supporting_document' } });
    expect(att.status).toBe(201);
    expect(JSON.stringify((await call('GET', '/attachments?entityType=invoice&entityId=123')).json)).toContain(fileId);

    // Tenant B sees none of it.
    for (const url of [`/files/${fileId}`, `/files/${fileId}/download-url`]) {
      const res = await call('GET', url, { tenant: 'tenant-b' });
      expect(res.status).toBe(404);
      expect(res.json.error?.details?.reason).toBe('STORAGE_FILE_NOT_FOUND');
    }
    expect((await call('DELETE', `/files/${fileId}`, { tenant: 'tenant-b' })).status).toBe(404);
    expect((await call('GET', `/folders/${folderId}/files`, { tenant: 'tenant-b' })).status).toBe(404);
    expect((await call('GET', '/attachments?entityType=invoice&entityId=123', { tenant: 'tenant-b' })).json.data).toEqual([]);
    expect((await call('PATCH', `/configurations/${configA}`, { tenant: 'tenant-b', body: { name: 'pwn' } })).status).toBe(404);
    expect((await call('POST', '/folders', { tenant: 'tenant-b', body: { name: 'x', storageConfigId: configA } })).status).toBe(404);
    expect((await call('POST', '/uploads', { tenant: 'tenant-b', body: { folderId, fileName: 'x.txt', contentType: 'text/plain', fileSize: 1 } })).status).toBe(404);
    expect(configB).toBeDefined();

    // Delete removes the object and hides the record.
    expect((await call('DELETE', `/files/${fileId}`)).status).toBe(204);
    expect((await call('GET', `/files/${fileId}`)).status).toBe(404);
    const row = (await pool.query<{ status: string; deleted_at: Date | null }>(`SELECT status, deleted_at FROM maw_storage_files WHERE id = $1`, [fileId])).rows[0]!;
    expect(row.status).toBe('deleted');
    expect(row.deleted_at).not.toBeNull();
    expect((await fetch(dl.json.data!.url)).status).toBe(404); // object is gone
  });

  it('fails the upload when the bytes do not match what was declared', async () => {
    const up = await call<{ fileId: string; uploadUrl: string; headers: Record<string, string> }>('POST', '/uploads', {
      body: { fileName: 'a.txt', contentType: 'text/plain', fileSize: 5 },
    });
    // Sneak a different size past the gateway is impossible, so tamper with the DB-declared size instead.
    await pool.query(`UPDATE maw_storage_files SET file_size = 99 WHERE id = $1`, [up.json.data!.fileId]);
    expect((await fetch(up.json.data!.uploadUrl, { method: 'PUT', headers: up.json.data!.headers, body: 'hello' })).status).toBe(200);
    const res = await call('POST', `/uploads/${up.json.data!.fileId}/complete`);
    expect(res.status).toBe(409);
    expect(res.json.error?.details?.reason).toBe('STORAGE_UPLOAD_FAILED');
    expect((await pool.query<{ status: string }>(`SELECT status FROM maw_storage_files WHERE id = $1`, [up.json.data!.fileId])).rows[0]!.status).toBe('failed');
  });

  it('rejects oversize uploads at request time and enforces RBAC per route', async () => {
    const big = await call('POST', '/uploads', { body: { fileName: 'big.bin', contentType: 'application/octet-stream', fileSize: 5_000_000 } });
    expect(big.status).toBe(400);

    const readOnly = ['Read_Storage'];
    expect((await call('POST', '/uploads', { perms: readOnly, body: { fileName: 'a.txt', contentType: 'text/plain', fileSize: 1 } })).status).toBe(403);
    expect((await call('POST', '/folders', { perms: readOnly, body: { name: 'nope' } })).status).toBe(403);
    expect((await call('GET', '/configurations', { perms: readOnly })).status).toBe(403);
    expect((await call('GET', '/folders', { perms: readOnly })).status).toBe(200);
  });

  it('deletes empty folders and protects configurations that are in use', async () => {
    const f = await call<{ id: string }>('POST', '/folders', { body: { name: 'Temp' } });
    expect((await call('DELETE', `/folders/${f.json.data!.id}`)).status).toBe(204);
    expect((await call('DELETE', `/configurations/${configA}`)).status).toBe(409); // default + referenced
  });
});
