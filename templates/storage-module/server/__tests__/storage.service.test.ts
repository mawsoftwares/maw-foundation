import { describe, expect, it } from 'vitest';
import { storageErrors } from '../core/storage.errors';
import { validateCreateUpload } from '../validators/storage.validators';
import { actor, buildHarness, TENANT_A, TENANT_B, uploadFile } from './harness';

const A = actor(TENANT_A);
const B = actor(TENANT_B);

async function setup() {
  const h = buildHarness();
  const configA = await h.seedConfig(TENANT_A);
  const configB = await h.seedConfig(TENANT_B);
  return { h, configA, configB };
}

describe('upload lifecycle', () => {
  it('creates a pending record, then verifies and marks it uploaded (+ version 1)', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    expect(up.method).toBe('PUT');
    expect(up.expiresIn).toBe(900);
    expect(up.file.status).toBe('pending');

    const done = await h.uploads.completeUpload(A, up.fileId);
    expect(done).toMatchObject({ id: up.fileId, name: 'invoice.pdf', mimeType: 'application/pdf', size: 1234, status: 'uploaded' });
    expect(h.store.versions).toHaveLength(1);
    expect(h.store.versions[0]!.versionNumber).toBe(1);
  });

  it('is idempotent when completed twice', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    await h.uploads.completeUpload(A, up.fileId);
    await expect(h.uploads.completeUpload(A, up.fileId)).resolves.toMatchObject({ status: 'uploaded' });
    expect(h.store.versions).toHaveLength(1);
  });

  it('marks the file failed and removes the object when the size does not match', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A, { putSize: 9999 });
    await expect(h.uploads.completeUpload(A, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_UPLOAD_FAILED' });
    expect(h.store.files.get(up.fileId)!.status).toBe('failed');
    expect(h.providerFor(up.file.storageConfigId).objects.has(up.file.objectKey)).toBe(false);
    await expect(h.uploads.completeUpload(A, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_UPLOAD_FAILED' });
  });

  it('marks the file failed when the stored content type differs', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    h.providerFor(up.file.storageConfigId).objects.set(up.file.objectKey, { size: 1234, contentType: 'text/html' });
    await expect(h.uploads.completeUpload(A, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_UPLOAD_FAILED' });
    expect(h.store.files.get(up.fileId)!.status).toBe('failed');
  });

  it('leaves the file pending (retryable) when the object has not arrived yet', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A, { putSize: null });
    await expect(h.uploads.completeUpload(A, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_UPLOAD_NOT_COMPLETED' });
    expect(h.store.files.get(up.fileId)!.status).toBe('pending');
  });

  it('never puts the original filename in the object key and keeps it as metadata', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A, { fileName: 'secret plan.pdf' });
    expect(up.file.objectKey).toBe(`tenant/${TENANT_A}/folder/root/file/${up.fileId}/original`);
    expect(up.file.objectKey).not.toContain('secret');
    expect(up.file).toMatchObject({ originalName: 'secret plan.pdf', extension: 'pdf', visibility: 'private' });
  });

  it('marks the record failed if the provider cannot sign the URL', async () => {
    const { h, configA } = await setup();
    h.providerFor(configA).createUploadUrl = async () => {
      throw storageErrors.providerError();
    };
    await expect(uploadFile(h, A)).rejects.toMatchObject({ reason: 'STORAGE_PROVIDER_ERROR' });
    expect([...h.store.files.values()][0]!.status).toBe('failed');
  });

  it('requires a configured default storage', async () => {
    const h = buildHarness();
    await expect(uploadFile(h, A)).rejects.toMatchObject({ reason: 'STORAGE_CONFIGURATION_NOT_FOUND' });
  });
});

describe('upload validation', () => {
  const limits = { uploadUrlTtlSeconds: 900, downloadUrlTtlSeconds: 300, maxFileSizeBytes: 1000, allowedMimeTypes: ['image/*', 'application/pdf'] };
  const ok = { fileName: 'a.pdf', contentType: 'application/pdf', fileSize: 10 };

  it('accepts a valid request and normalises it', () => {
    expect(validateCreateUpload({ ...ok, contentType: 'Application/PDF' }, limits)).toMatchObject({ contentType: 'application/pdf', folderId: null });
  });
  it.each([
    ['oversized', { ...ok, fileSize: 1001 }],
    ['zero size', { ...ok, fileSize: 0 }],
    ['fractional size', { ...ok, fileSize: 1.5 }],
    ['string size', { ...ok, fileSize: '10' }],
    ['malformed mime', { ...ok, contentType: 'nonsense' }],
    ['disallowed mime', { ...ok, contentType: 'application/x-msdownload' }],
    ['missing name', { ...ok, fileName: ' ' }],
    ['dots-only name', { ...ok, fileName: '...' }],
    ['bad folder id', { ...ok, folderId: 'not-a-uuid' }],
  ])('rejects %s', (_label, body) => {
    expect(() => validateCreateUpload(body, limits)).toThrow();
  });
  it('sanitises path characters in the file name', () => {
    expect(validateCreateUpload({ ...ok, fileName: '../../etc/passwd' }, limits).fileName).not.toContain('/');
  });
});

describe('tenant isolation', () => {
  it("tenant B cannot read, download, complete or delete tenant A's file", async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    await h.uploads.completeUpload(A, up.fileId);

    await expect(h.files.getFile(TENANT_B, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
    await expect(h.downloads.createDownloadUrl(B, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
    await expect(h.uploads.completeUpload(B, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
    await expect(h.files.deleteFile(B, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
    await expect(h.attachments.attach(B, { fileId: up.fileId, entityType: 'invoice', entityId: '1', category: 'general' })).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
    // ...and the owner is unaffected.
    await expect(h.files.getFile(TENANT_A, up.fileId)).resolves.toMatchObject({ status: 'uploaded' });
  });

  it("tenant B cannot see, list into, create under or upload into tenant A's folder", async () => {
    const { h } = await setup();
    const folder = await h.folders.create(A, { name: 'Private', parentId: null });

    await expect(h.files.listFiles(TENANT_B, { folderId: folder.id, page: 1, pageSize: 10 })).rejects.toMatchObject({ reason: 'STORAGE_FOLDER_NOT_FOUND' });
    await expect(h.folders.create(B, { name: 'Sneaky', parentId: folder.id })).rejects.toMatchObject({ reason: 'STORAGE_FOLDER_NOT_FOUND' });
    await expect(h.folders.update(TENANT_B, folder.id, { name: 'Hijacked' })).rejects.toMatchObject({ reason: 'STORAGE_FOLDER_NOT_FOUND' });
    await expect(h.folders.delete(TENANT_B, folder.id)).rejects.toMatchObject({ reason: 'STORAGE_FOLDER_NOT_FOUND' });
    await expect(uploadFile(h, B, { folderId: folder.id })).rejects.toMatchObject({ reason: 'STORAGE_FOLDER_NOT_FOUND' });
    expect(h.store.files.size).toBe(0);
  });

  it("tenant B cannot use, change, test or delete tenant A's storage configuration", async () => {
    const { h, configA } = await setup();
    await expect(h.folders.create(B, { name: 'X', parentId: null, storageConfigId: configA })).rejects.toMatchObject({ reason: 'STORAGE_CONFIGURATION_NOT_FOUND' });
    await expect(h.configurations.update(TENANT_B, configA, { name: 'pwn' })).rejects.toMatchObject({ reason: 'STORAGE_CONFIGURATION_NOT_FOUND' });
    await expect(h.configurations.test(TENANT_B, configA)).rejects.toMatchObject({ reason: 'STORAGE_CONFIGURATION_NOT_FOUND' });
    await expect(h.configurations.delete(TENANT_B, configA)).rejects.toMatchObject({ reason: 'STORAGE_CONFIGURATION_NOT_FOUND' });
    await expect(h.configurations.resolve(TENANT_B, configA)).rejects.toMatchObject({ reason: 'STORAGE_CONFIGURATION_NOT_FOUND' });
  });

  it('keeps listings and folder contents per tenant', async () => {
    const { h } = await setup();
    await h.folders.create(A, { name: 'Docs', parentId: null });
    await h.folders.create(B, { name: 'Docs', parentId: null }); // same name allowed across tenants
    expect((await h.folders.list(TENANT_A, { parentId: null, page: 1, pageSize: 10 })).total).toBe(1);
    expect((await h.configurations.list(TENANT_A)).every((c) => c.name.startsWith(TENANT_A))).toBe(true);
  });
});

describe('configuration secrets', () => {
  const s3 = {
    provider: 's3' as const,
    name: 'Prod',
    bucket: 'client-files',
    region: 'ap-south-1',
    credentials: { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'super-secret-value' },
  };

  it('encrypts credentials at rest and never returns them', async () => {
    const { h } = await setup();
    const view = await h.configurations.create(TENANT_A, s3);
    const stored = h.store.configs.get(view.id)!;

    expect(stored.encryptedCredentials).toBeTruthy();
    expect(stored.encryptedCredentials).not.toContain('super-secret-value');
    expect(stored.encryptedCredentials).not.toContain('AKIAEXAMPLE');

    const everything = JSON.stringify([view, await h.configurations.list(TENANT_A), await h.configurations.update(TENANT_A, view.id, { name: 'Renamed' })]);
    for (const leaked of ['super-secret-value', 'AKIAEXAMPLE', 'encryptedCredentials', 'secretAccessKey', 'accessKeyId']) {
      expect(everything).not.toContain(leaked);
    }
    expect(view).toMatchObject({ provider: 's3', bucket: 'client-files', region: 'ap-south-1', hasCredentials: true });
  });

  it('decrypts credentials only when handing the runtime config to a provider', async () => {
    const { h } = await setup();
    const seen: unknown[] = [];
    h.factory.register('s3', (config) => {
      seen.push(config.credentials);
      return h.providerFor(config.configId);
    });
    const view = await h.configurations.create(TENANT_A, s3);
    await h.configurations.resolve(TENANT_A, view.id);
    expect(seen[0]).toEqual(s3.credentials);
  });

  it('keeps existing credentials on update unless new ones are supplied', async () => {
    const { h } = await setup();
    const view = await h.configurations.create(TENANT_A, s3);
    const before = h.store.configs.get(view.id)!.encryptedCredentials;
    await h.configurations.update(TENANT_A, view.id, { name: 'x' });
    expect(h.store.configs.get(view.id)!.encryptedCredentials).toBe(before);
    await h.configurations.update(TENANT_A, view.id, { credentials: { accessKeyId: 'NEW', secretAccessKey: 'newer-secret' } });
    expect(h.store.configs.get(view.id)!.encryptedCredentials).not.toBe(before);
  });

  it('validates provider-specific rules and base paths', async () => {
    const { h } = await setup();
    await expect(h.configurations.create(TENANT_A, { provider: 'local', name: 'x', basePath: '../escape' })).rejects.toMatchObject({ reason: 'STORAGE_INVALID_INPUT' });
    await expect(h.configurations.create(TENANT_A, { provider: 'local', name: 'x', credentials: s3.credentials })).rejects.toMatchObject({ reason: 'STORAGE_INVALID_INPUT' });
    await expect(h.configurations.create(TENANT_A, { provider: 's3', name: 'x' })).resolves.toBeDefined(); // validator enforces bucket/region at the API edge
  });

  it('keeps exactly one default and protects it from deletion/deactivation', async () => {
    const { h, configA } = await setup();
    const second = await h.configurations.create(TENANT_A, { provider: 'local', name: 'second', isDefault: true });
    const list = await h.configurations.list(TENANT_A);
    expect(list.filter((c) => c.isDefault).map((c) => c.id)).toEqual([second.id]);
    await expect(h.configurations.delete(TENANT_A, second.id)).rejects.toMatchObject({ reason: 'STORAGE_CONFLICT' });
    await expect(h.configurations.update(TENANT_A, second.id, { isActive: false })).rejects.toMatchObject({ reason: 'STORAGE_CONFLICT' });
    await expect(h.configurations.delete(TENANT_A, configA)).resolves.toBeUndefined();
  });

  it('reports a failing connection test without leaking details', async () => {
    const { h, configA } = await setup();
    h.providerFor(configA).verifyAccess = async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.5:9000 with key AKIA...');
    };
    const result = await h.configurations.test(TENANT_A, configA);
    expect(result.ok).toBe(false);
    expect(result.message).not.toMatch(/10\.0\.0\.5|AKIA/);
  });
});

describe('folders', () => {
  it('creates root and child folders with materialised paths', async () => {
    const { h, configA } = await setup();
    const root = await h.folders.create(A, { name: 'Documents', parentId: null });
    const child = await h.folders.create(A, { name: 'Contracts', parentId: root.id });
    expect(root).toMatchObject({ path: '/Documents', parentId: null, storageConfigId: configA });
    expect(child).toMatchObject({ path: '/Documents/Contracts', parentId: root.id, storageConfigId: configA });
    expect((await h.folders.list(TENANT_A, { parentId: root.id, page: 1, pageSize: 10 })).items.map((f) => f.name)).toEqual(['Contracts']);
  });

  it('renames a folder and rewrites descendant paths', async () => {
    const { h } = await setup();
    const root = await h.folders.create(A, { name: 'Docs', parentId: null });
    const child = await h.folders.create(A, { name: 'Inv', parentId: root.id });
    const grandchild = await h.folders.create(A, { name: 'Q1', parentId: child.id });
    await h.folders.update(TENANT_A, root.id, { name: 'Documents' });
    expect(h.store.folders.get(child.id)!.path).toBe('/Documents/Inv');
    expect(h.store.folders.get(grandchild.id)!.path).toBe('/Documents/Inv/Q1');
  });

  it('moves a folder to a new parent', async () => {
    const { h } = await setup();
    const a = await h.folders.create(A, { name: 'A', parentId: null });
    const b = await h.folders.create(A, { name: 'B', parentId: null });
    const c = await h.folders.create(A, { name: 'C', parentId: a.id });
    await h.folders.update(TENANT_A, c.id, { parentId: b.id });
    expect(h.store.folders.get(c.id)).toMatchObject({ parentId: b.id, path: '/B/C' });
  });

  it('prevents circular hierarchies', async () => {
    const { h } = await setup();
    const a = await h.folders.create(A, { name: 'A', parentId: null });
    const b = await h.folders.create(A, { name: 'B', parentId: a.id });
    await expect(h.folders.update(TENANT_A, a.id, { parentId: b.id })).rejects.toMatchObject({ reason: 'STORAGE_CONFLICT' });
    await expect(h.folders.update(TENANT_A, a.id, { parentId: a.id })).rejects.toMatchObject({ reason: 'STORAGE_CONFLICT' });
  });

  it('rejects an unknown parent and duplicate sibling names (case-insensitive)', async () => {
    const { h } = await setup();
    await expect(h.folders.create(A, { name: 'X', parentId: '00000000-0000-4000-8000-000000000000' })).rejects.toMatchObject({ reason: 'STORAGE_FOLDER_NOT_FOUND' });
    await h.folders.create(A, { name: 'Reports', parentId: null });
    await expect(h.folders.create(A, { name: 'reports', parentId: null })).rejects.toMatchObject({ reason: 'STORAGE_CONFLICT' });
  });

  it('soft-deletes empty folders and refuses non-empty ones', async () => {
    const { h } = await setup();
    const root = await h.folders.create(A, { name: 'Root', parentId: null });
    const child = await h.folders.create(A, { name: 'Child', parentId: root.id });
    await expect(h.folders.delete(TENANT_A, root.id)).rejects.toMatchObject({ reason: 'STORAGE_CONFLICT' });
    await h.folders.delete(TENANT_A, child.id);
    await h.folders.delete(TENANT_A, root.id);
    await expect(h.folders.require(TENANT_A, root.id)).rejects.toMatchObject({ reason: 'STORAGE_FOLDER_NOT_FOUND' });

    const f = await h.folders.create(A, { name: 'WithFile', parentId: null });
    const up = await uploadFile(h, A, { folderId: f.id });
    await h.uploads.completeUpload(A, up.fileId);
    await expect(h.folders.delete(TENANT_A, f.id)).rejects.toMatchObject({ reason: 'STORAGE_CONFLICT' });
  });

  it('puts uploads in the folder and uses the folder in the object key', async () => {
    const { h } = await setup();
    const f = await h.folders.create(A, { name: 'Inbox', parentId: null });
    const up = await uploadFile(h, A, { folderId: f.id });
    expect(up.file.folderId).toBe(f.id);
    expect(up.file.objectKey).toBe(`tenant/${TENANT_A}/folder/${f.id}/file/${up.fileId}/original`);
  });
});

describe('files', () => {
  it('returns metadata only (no keys, no provider info)', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    await h.uploads.completeUpload(A, up.fileId);
    const view = await h.files.getFile(TENANT_A, up.fileId);
    expect(Object.keys(view).sort()).toEqual(['createdAt', 'folderId', 'id', 'mimeType', 'name', 'size', 'status', 'updatedAt']);
  });

  it('issues a short-lived download URL only for uploaded files', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    await expect(h.downloads.createDownloadUrl(A, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_UPLOAD_NOT_COMPLETED' });
    await h.uploads.completeUpload(A, up.fileId);
    const dl = await h.downloads.createDownloadUrl(A, up.fileId);
    expect(dl.expiresIn).toBe(300);
    expect(dl.url).toContain(up.file.objectKey);
  });

  it('reports a missing file', async () => {
    const { h } = await setup();
    await expect(h.files.getFile(TENANT_A, '00000000-0000-4000-8000-000000000000')).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
  });

  it('deletes the object and hides the file', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    await h.uploads.completeUpload(A, up.fileId);
    await h.files.deleteFile(A, up.fileId);
    expect(h.providerFor(up.file.storageConfigId).objects.has(up.file.objectKey)).toBe(false);
    expect(h.store.files.get(up.fileId)).toMatchObject({ status: 'deleted' });
    await expect(h.files.getFile(TENANT_A, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
  });

  it('hides the file but keeps it recoverable for cleanup when the provider delete fails', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    await h.uploads.completeUpload(A, up.fileId);
    h.providerFor(up.file.storageConfigId).failDelete = true;
    await expect(h.files.deleteFile(A, up.fileId)).resolves.toBeUndefined();
    const row = h.store.files.get(up.fileId)!;
    expect(row.deletedAt).not.toBeNull();
    expect(row.status).toBe('uploaded'); // not 'deleted' ⇒ cleanup job retries the object delete
    await expect(h.files.getFile(TENANT_A, up.fileId)).rejects.toMatchObject({ reason: 'STORAGE_FILE_NOT_FOUND' });
  });

  it('lists only uploaded files in a folder, with search and pagination', async () => {
    const { h } = await setup();
    const names = ['alpha.pdf', 'beta.pdf', 'gamma.txt'];
    for (const fileName of names) await h.uploads.completeUpload(A, (await uploadFile(h, A, { fileName })).fileId);
    await uploadFile(h, A, { fileName: 'pending.pdf' }); // never completed

    const all = await h.files.listFiles(TENANT_A, { folderId: null, page: 1, pageSize: 2 });
    expect(all.total).toBe(3);
    expect(all.items.map((f) => f.name)).toEqual(['alpha.pdf', 'beta.pdf']);
    const found = await h.files.listFiles(TENANT_A, { folderId: null, page: 1, pageSize: 10, search: 'GAMMA' });
    expect(found.items.map((f) => f.name)).toEqual(['gamma.txt']);
  });
});

describe('attachments', () => {
  it('attaches uploaded files to any entity, idempotently, and lists/removes them', async () => {
    const { h } = await setup();
    const up = await uploadFile(h, A);
    await expect(h.attachments.attach(A, { fileId: up.fileId, entityType: 'invoice', entityId: '123', category: 'supporting_document' })).rejects.toMatchObject({ reason: 'STORAGE_UPLOAD_NOT_COMPLETED' });
    await h.uploads.completeUpload(A, up.fileId);

    const input = { fileId: up.fileId, entityType: 'invoice', entityId: '123', category: 'supporting_document' };
    const first = await h.attachments.attach(A, input);
    expect((await h.attachments.attach(A, input)).id).toBe(first.id);
    expect(await h.attachments.list(TENANT_A, 'invoice', '123')).toHaveLength(1);
    expect(await h.attachments.list(TENANT_B, 'invoice', '123')).toHaveLength(0);
    await expect(h.attachments.detach(TENANT_B, first.id)).rejects.toBeDefined();
    await h.attachments.detach(TENANT_A, first.id);
    expect(await h.attachments.list(TENANT_A, 'invoice', '123')).toHaveLength(0);
  });
});
