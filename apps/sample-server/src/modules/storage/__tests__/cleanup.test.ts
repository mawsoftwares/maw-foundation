import { describe, expect, it } from 'vitest';
import { actor, buildHarness, TENANT_A, TENANT_B, uploadFile } from './harness';

const A = actor(TENANT_A);
const OPTS = { pendingOlderThanHours: 24, batchSize: 50 };

function age(h: ReturnType<typeof buildHarness>, fileId: string, hours: number): void {
  const f = h.store.files.get(fileId)!;
  h.store.files.set(fileId, { ...f, createdAt: new Date(Date.now() - hours * 3_600_000).toISOString() });
}

describe('storage cleanup', () => {
  it('fails abandoned uploads and removes partial objects, leaving fresh and completed ones alone', async () => {
    const h = buildHarness();
    await h.seedConfig(TENANT_A);
    await h.seedConfig(TENANT_B);
    const stale = await uploadFile(h, A);
    const staleB = await uploadFile(h, actor(TENANT_B));
    const fresh = await uploadFile(h, A);
    const done = await uploadFile(h, A);
    await h.uploads.completeUpload(A, done.fileId);
    for (const id of [stale.fileId, staleB.fileId, done.fileId]) age(h, id, 48);

    const report = await h.cleanup.run(OPTS);
    expect(report).toMatchObject({ abandonedUploads: 2, errors: 0 });
    expect(h.store.files.get(stale.fileId)!.status).toBe('failed');
    expect(h.store.files.get(staleB.fileId)!.status).toBe('failed');
    expect(h.providerFor(stale.file.storageConfigId).objects.has(stale.file.objectKey)).toBe(false);
    expect(h.store.files.get(fresh.fileId)!.status).toBe('pending');
    expect(h.store.files.get(done.fileId)!.status).toBe('uploaded');
  });

  it('retries interrupted deletions until the object is gone', async () => {
    const h = buildHarness();
    await h.seedConfig(TENANT_A);
    const up = await uploadFile(h, A);
    await h.uploads.completeUpload(A, up.fileId);
    const provider = h.providerFor(up.file.storageConfigId);
    provider.failDelete = true;
    await h.files.deleteFile(A, up.fileId);
    expect(h.store.files.get(up.fileId)!.status).toBe('uploaded');

    expect(await h.cleanup.run(OPTS)).toMatchObject({ retriedDeletions: 0, errors: 1 });
    provider.failDelete = false;
    expect(await h.cleanup.run(OPTS)).toMatchObject({ retriedDeletions: 1, errors: 0 });
    expect(h.store.files.get(up.fileId)!.status).toBe('deleted');
    expect(provider.objects.has(up.file.objectKey)).toBe(false);
    expect(await h.cleanup.run(OPTS)).toMatchObject({ retriedDeletions: 0, abandonedUploads: 0 });
  });
});
