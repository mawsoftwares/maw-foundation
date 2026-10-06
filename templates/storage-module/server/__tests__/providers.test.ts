import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StorageProviderFactory, type StorageProviderRuntimeConfig } from '../core/StorageProviderFactory';
import { STORAGE_LOCAL_GATEWAY_PATH } from '../core/storage.constants';
import {
  createDefaultProviderFactory,
  createLocalObjectRouter,
  LocalStorageProvider,
  LocalUrlSigner,
  S3StorageProvider,
  S3_DESCRIPTOR,
  R2StorageProvider,
  AzureBlobStorageProvider,
} from '../providers';

const AZURE_KEY = Buffer.from('k'.repeat(32)).toString('base64');
import { buildObjectKey, assertSafeObjectKey, normalizeBasePath, extensionOf } from '../utils/object-key.util';

const SECRET = 'unit-test-signing-secret-123456';
const KEY = 'tenant/t1/folder/root/file/00000000-0000-4000-8000-000000000001/original';

describe('LocalStorageProvider + gateway (real HTTP)', () => {
  let root: string;
  let server: Server;
  let origin: string;
  let provider: LocalStorageProvider;
  const signer = new LocalUrlSigner(SECRET);

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'maw-storage-test-'));
    const app = express();
    // No body parser on purpose: the gateway streams raw bodies.
    const holder: { current?: LocalStorageProvider } = {};
    app.use(
      STORAGE_LOCAL_GATEWAY_PATH,
      createLocalObjectRouter({
        signer,
        resolveProvider: async (tenantId, configId) => (tenantId === 't1' && configId === 'c1' ? (holder.current ?? null) : null),
      }),
    );
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    provider = new LocalStorageProvider({
      rootDir: root,
      signer,
      publicBaseUrl: origin,
      gatewayPath: STORAGE_LOCAL_GATEWAY_PATH,
      tenantId: 't1',
      configId: 'c1',
    });
    holder.current = provider;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  });

  const body = new Uint8Array(Buffer.from('hello storage'));

  async function upload(content: Uint8Array<ArrayBuffer> = body, headers: Record<string, string> = {}) {
    const signed = await provider.createUploadUrl({ key: KEY, contentType: 'text/plain', contentLength: body.length, expiresInSeconds: 60 });
    return { signed, res: await fetch(signed.url, { method: signed.method, headers: { ...signed.headers, ...headers }, body: content }) };
  }

  it('uploads directly through a signed URL, then reports exists + metadata', async () => {
    expect(await provider.objectExists({ key: KEY })).toBe(false);
    const { signed, res } = await upload();
    expect(res.status).toBe(200);
    expect(signed.headers).toEqual({ 'Content-Type': 'text/plain' });
    expect(await provider.objectExists({ key: KEY })).toBe(true);
    expect(await provider.getObjectMetadata({ key: KEY })).toMatchObject({ size: body.length });
  });

  it('downloads through a signed URL with safe headers and never exposes the filesystem path', async () => {
    const dl = await provider.createDownloadUrl({ key: KEY, fileName: 'héllo "x".txt', contentType: 'text/plain', disposition: 'attachment', expiresInSeconds: 60 });
    expect(dl.url).not.toContain(root);
    const res = await fetch(dl.url);
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(Buffer.from(body))).toBe(true);
    expect(res.headers.get('content-disposition')).toContain('attachment');
    expect(res.headers.get('content-disposition')).not.toContain('"x"');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects tampered, expired, wrong-operation and unknown-tenant tokens', async () => {
    const { signed } = await upload();
    const token = signed.url.split('/').pop()!;
    const tampered = `${token.slice(0, -2)}xx`;
    expect((await fetch(`${origin}${STORAGE_LOCAL_GATEWAY_PATH}/${tampered}`, { method: 'PUT', body })).status).toBe(403);

    const expired = signer.sign({ tenantId: 't1', configId: 'c1', key: KEY, op: 'put', exp: Math.floor(Date.now() / 1000) - 5, contentType: 'text/plain', contentLength: 1 });
    expect((await fetch(`${origin}${STORAGE_LOCAL_GATEWAY_PATH}/${expired}`, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: 'x' })).status).toBe(403);

    const getDl = await provider.createDownloadUrl({ key: KEY, fileName: 'a.txt', contentType: 'text/plain', disposition: 'inline', expiresInSeconds: 60 });
    expect((await fetch(getDl.url, { method: 'PUT', body })).status).toBe(403); // GET token cannot upload

    const otherTenant = signer.sign({ tenantId: 't2', configId: 'c1', key: KEY, op: 'get', exp: Math.floor(Date.now() / 1000) + 60, contentType: 'text/plain' });
    expect((await fetch(`${origin}${STORAGE_LOCAL_GATEWAY_PATH}/${otherTenant}`)).status).toBe(404);
  });

  it('enforces declared content type and size', async () => {
    const wrongType = await upload(body, { 'Content-Type': 'text/html' });
    expect(wrongType.res.status).toBe(400);

    const signed = await provider.createUploadUrl({ key: `${KEY}2`, contentType: 'text/plain', contentLength: 3, expiresInSeconds: 60 });
    const tooBig = await fetch(signed.url, { method: 'PUT', headers: signed.headers, body: new Uint8Array(Buffer.from('way too long')) });
    expect(tooBig.status).toBe(400); // content-length header mismatch
    expect(await provider.objectExists({ key: `${KEY}2` })).toBe(false);
    expect((await readdir(root, { recursive: true })).some((f) => f.includes('.part-'))).toBe(false);
  });

  it('deletes objects idempotently', async () => {
    await upload();
    await provider.deleteObject({ key: KEY });
    expect(await provider.objectExists({ key: KEY })).toBe(false);
    await expect(provider.deleteObject({ key: KEY })).resolves.toBeUndefined();
    await expect(provider.getObjectMetadata({ key: KEY })).rejects.toMatchObject({ reason: 'STORAGE_OBJECT_NOT_FOUND' });
  });

  it('blocks path traversal and arbitrary paths from ever reaching the filesystem', async () => {
    for (const key of ['../../etc/passwd', '/etc/passwd', 'a/../../b', 'a//b', 'a/./b', '', 'a\\b', 'tenant/t1/%2e%2e/x']) {
      await expect(provider.objectExists({ key })).rejects.toMatchObject({ reason: 'STORAGE_INVALID_INPUT' });
      await expect(provider.deleteObject({ key })).rejects.toMatchObject({ reason: 'STORAGE_INVALID_INPUT' });
      await expect(provider.createUploadUrl({ key, contentType: 'text/plain', contentLength: 1, expiresInSeconds: 60 })).rejects.toMatchObject({ reason: 'STORAGE_INVALID_INPUT' });
    }
  });

  it('verifies access (creates the root when missing)', async () => {
    await expect(provider.verifyAccess()).resolves.toBeUndefined();
  });
});

describe('LocalUrlSigner', () => {
  it('rejects short secrets and malformed tokens', () => {
    expect(() => new LocalUrlSigner('short')).toThrow();
    const s = new LocalUrlSigner(SECRET);
    for (const t of ['', 'abc', 'a.b.c', '.']) expect(s.verify(t)).toBeNull();
  });
  it('does not verify tokens signed with another secret', () => {
    const token = new LocalUrlSigner(SECRET).sign({ tenantId: 't', configId: 'c', key: 'k', op: 'get', exp: Math.floor(Date.now() / 1000) + 60, contentType: 'x/y' });
    expect(new LocalUrlSigner('another-secret-another-secret').verify(token)).toBeNull();
  });
});

describe('S3StorageProvider signed URLs (offline signing)', () => {
  const config: StorageProviderRuntimeConfig = {
    configId: 'c1',
    tenantId: 't1',
    providerType: 's3',
    bucketName: 'client-files',
    region: 'ap-south-1',
    endpoint: null,
    basePath: 'maw/prod',
    credentials: { accessKeyId: 'AKIAEXAMPLEKEY12345', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
  };

  it('signs a PUT URL bound to bucket, base path, key, type, size and expiry — without leaking the secret', async () => {
    const out = await new S3StorageProvider(config).createUploadUrl({ key: KEY, contentType: 'application/pdf', contentLength: 125000, expiresInSeconds: 900 });
    const url = new URL(out.url);
    expect(out.method).toBe('PUT');
    expect(out.headers).toEqual({ 'Content-Type': 'application/pdf' });
    expect(url.hostname).toBe('client-files.s3.ap-south-1.amazonaws.com');
    expect(url.pathname).toBe(`/maw/prod/${KEY}`);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders') ?? '';
    expect(signedHeaders).toContain('content-type');
    expect(signedHeaders).toContain('content-length');
    // A body checksum baked into the URL would make real uploads fail (it is computed for an empty body).
    expect([...url.searchParams.keys()].filter((k) => k.toLowerCase().includes('checksum'))).toEqual([]);
    expect(out.url).not.toContain(config.credentials!.secretAccessKey);
    expect(new Date(out.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('signs a GET URL with attachment disposition and a short expiry', async () => {
    const out = await new S3StorageProvider(config).createDownloadUrl({ key: KEY, fileName: 'invoice.pdf', contentType: 'application/pdf', disposition: 'attachment', expiresInSeconds: 300 });
    const url = new URL(out.url);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('response-content-disposition')).toContain('attachment; filename="invoice.pdf"');
    expect(url.searchParams.get('response-content-type')).toBe('application/pdf');
  });

  it('supports S3-compatible endpoints with path-style addressing', async () => {
    const out = await new S3StorageProvider({ ...config, endpoint: 'http://localhost:9000', basePath: '' }).createDownloadUrl({ key: KEY, fileName: 'a.txt', contentType: 'text/plain', disposition: 'inline', expiresInSeconds: 60 });
    const url = new URL(out.url);
    expect(url.host).toBe('localhost:9000');
    expect(url.pathname).toBe(`/client-files/${KEY}`);
  });

  it('refuses unsafe keys and incomplete configuration', async () => {
    const p = new S3StorageProvider(config);
    await expect(p.createDownloadUrl({ key: '../x', fileName: 'a', contentType: 'a/b', disposition: 'inline', expiresInSeconds: 60 })).rejects.toMatchObject({ reason: 'STORAGE_INVALID_INPUT' });
    expect(() => new S3StorageProvider({ ...config, bucketName: null })).toThrow();
  });
});

describe('StorageProviderFactory', () => {
  const runtime = (providerType: StorageProviderRuntimeConfig['providerType'], basePath = ''): StorageProviderRuntimeConfig => ({
    configId: 'c1', tenantId: 't1', providerType, bucketName: 'b', region: 'us-east-1', endpoint: null, basePath, credentials: null,
  });

  it('builds the right provider from configuration alone', () => {
    const factory = createDefaultProviderFactory({ localRoot: os.tmpdir(), localSigner: new LocalUrlSigner(SECRET), publicBaseUrl: 'http://x' });
    expect(factory.supportedTypes().sort()).toEqual(['azure', 'local', 'r2', 's3']);
    expect(factory.get(runtime('local'))).toBeInstanceOf(LocalStorageProvider);
    expect(factory.get(runtime('s3'))).toBeInstanceOf(S3StorageProvider);
    expect(factory.get({ ...runtime('r2'), endpoint: 'https://acct123456.r2.cloudflarestorage.com' })).toBeInstanceOf(R2StorageProvider);
    expect(
      factory.get({ ...runtime('azure'), credentials: { accessKeyId: 'acct', secretAccessKey: AZURE_KEY } }),
    ).toBeInstanceOf(AzureBlobStorageProvider);
  });

  it('throws STORAGE_PROVIDER_NOT_FOUND for unknown providers and accepts new registrations', () => {
    const factory = new StorageProviderFactory();
    expect(() => factory.get(runtime('s3'))).toThrowError(expect.objectContaining({ reason: 'STORAGE_PROVIDER_NOT_FOUND' }));
    factory.register('s3', () => ({}) as never, S3_DESCRIPTOR);
    expect(factory.isSupported('s3')).toBe(true);
    expect(factory.get(runtime('s3'))).toEqual({});
  });
});

describe('object key utilities', () => {
  it('builds tenant-isolated keys from ids only', () => {
    expect(buildObjectKey({ tenantId: 'demo-tenant', folderId: null, fileId: 'abc' })).toBe('tenant/demo-tenant/folder/root/file/abc/original');
    expect(buildObjectKey({ tenantId: 't', folderId: 'f1', fileId: 'x' })).toBe('tenant/t/folder/f1/file/x/original');
  });
  it('rejects unsafe identifiers', () => {
    for (const bad of ['../x', 'a/b', 'a b', '', 'x'.repeat(65)]) {
      expect(() => buildObjectKey({ tenantId: bad, folderId: null, fileId: 'f' })).toThrow();
      expect(() => buildObjectKey({ tenantId: 't', folderId: bad, fileId: 'f' })).toThrow();
    }
  });
  it('validates keys, base paths and extensions', () => {
    expect(assertSafeObjectKey('a/b-c_d/e')).toBe('a/b-c_d/e');
    expect(normalizeBasePath('/maw//'.replace('//', '/'))).toBe('maw');
    expect(normalizeBasePath(null)).toBe('');
    expect(() => normalizeBasePath('a/../b')).toThrow();
    expect(() => normalizeBasePath('a b')).toThrow();
    expect(extensionOf('Report.FINAL.PDF')).toBe('pdf');
    expect(extensionOf('noext')).toBe('');
    expect(extensionOf('.hidden')).toBe('');
  });
});

describe('R2StorageProvider (offline signing)', () => {
  const config: StorageProviderRuntimeConfig = {
    configId: 'c1', tenantId: 't1', providerType: 'r2', bucketName: 'client-files', region: 'auto',
    endpoint: 'https://abc123def456.r2.cloudflarestorage.com', basePath: 'maw', 
    credentials: { accessKeyId: 'r2accesskeyid', secretAccessKey: 'r2secretaccesskeyvalue1234567890' },
  };

  it('signs path-style PUT/GET URLs against the account endpoint with region "auto" and no body checksum', async () => {
    const p = new R2StorageProvider(config);
    const up = new URL((await p.createUploadUrl({ key: KEY, contentType: 'application/pdf', contentLength: 10, expiresInSeconds: 600 })).url);
    expect(up.host).toBe('abc123def456.r2.cloudflarestorage.com');
    expect(up.pathname).toBe(`/client-files/maw/${KEY}`);
    expect(up.searchParams.get('X-Amz-Credential')).toContain('/auto/s3/aws4_request');
    expect(up.searchParams.get('X-Amz-Expires')).toBe('600');
    expect([...up.searchParams.keys()].filter((k) => k.toLowerCase().includes('checksum'))).toEqual([]);
    const dl = new URL((await p.createDownloadUrl({ key: KEY, fileName: 'a.pdf', contentType: 'application/pdf', disposition: 'inline', expiresInSeconds: 300 })).url);
    expect(dl.searchParams.get('response-content-disposition')).toContain('inline');
  });

  it('requires an account endpoint', () => {
    expect(() => new R2StorageProvider({ ...config, endpoint: null })).toThrowError(expect.objectContaining({ reason: 'STORAGE_INVALID_INPUT' }));
  });
});

describe('AzureBlobStorageProvider (offline SAS signing)', () => {
  const config: StorageProviderRuntimeConfig = {
    configId: 'c1', tenantId: 't1', providerType: 'azure', bucketName: 'client-files', region: null, endpoint: null, basePath: 'maw/prod',
    credentials: { accessKeyId: 'mawstorage', secretAccessKey: AZURE_KEY },
  };

  it('issues a create+write SAS for direct upload, with the headers Azure requires', async () => {
    const out = await new AzureBlobStorageProvider(config).createUploadUrl({ key: KEY, contentType: 'image/png', contentLength: 99, expiresInSeconds: 900 });
    const url = new URL(out.url);
    expect(out.method).toBe('PUT');
    expect(out.headers).toEqual({ 'Content-Type': 'image/png', 'x-ms-blob-type': 'BlockBlob' });
    expect(url.host).toBe('mawstorage.blob.core.windows.net');
    expect(url.pathname).toBe(`/client-files/maw/prod/${KEY}`);
    expect(url.searchParams.get('sp')).toBe('cw');
    expect(url.searchParams.get('spr')).toBe('https');
    expect(url.searchParams.get('sig')).toBeTruthy();
    expect(Date.parse(url.searchParams.get('se')!)).toBeGreaterThan(Date.now());
    expect(out.url).not.toContain(AZURE_KEY);
  });

  it('issues a read-only SAS for download with disposition and content type overrides', async () => {
    const out = await new AzureBlobStorageProvider(config).createDownloadUrl({ key: KEY, fileName: 'Invoice 1.pdf', contentType: 'application/pdf', disposition: 'attachment', expiresInSeconds: 300 });
    const url = new URL(out.url);
    expect(url.searchParams.get('sp')).toBe('r');
    expect(url.searchParams.get('rscd')).toContain('attachment; filename="Invoice 1.pdf"');
    expect(url.searchParams.get('rsct')).toBe('application/pdf');
  });

  it('supports a custom endpoint (Azurite) and refuses unsafe keys and incomplete config', async () => {
    const azurite = new AzureBlobStorageProvider({ ...config, endpoint: 'http://127.0.0.1:10000/mawstorage', basePath: '' });
    const url = new URL((await azurite.createDownloadUrl({ key: KEY, fileName: 'a', contentType: 'a/b', disposition: 'inline', expiresInSeconds: 60 })).url);
    expect(url.origin).toBe('http://127.0.0.1:10000');
    await expect(new AzureBlobStorageProvider(config).createUploadUrl({ key: '../x', contentType: 'a/b', contentLength: 1, expiresInSeconds: 60 })).rejects.toMatchObject({ reason: 'STORAGE_INVALID_INPUT' });
    expect(() => new AzureBlobStorageProvider({ ...config, credentials: null })).toThrow();
    expect(() => new AzureBlobStorageProvider({ ...config, bucketName: null })).toThrow();
  });
});
