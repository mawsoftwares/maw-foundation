/**
 * Opt-in contract tests against REAL Cloudflare R2 / Azure Blob accounts. Each block is skipped
 * unless its variables are set. Each writes and deletes one small object under `maw-storage-live-test/`.
 *
 *   R2:    STORAGE_TEST_R2_ACCOUNT_ID, STORAGE_TEST_R2_BUCKET, STORAGE_TEST_R2_ACCESS_KEY_ID, STORAGE_TEST_R2_SECRET_ACCESS_KEY
 *   Azure: STORAGE_TEST_AZURE_ACCOUNT, STORAGE_TEST_AZURE_KEY, STORAGE_TEST_AZURE_CONTAINER [, STORAGE_TEST_AZURE_ENDPOINT for Azurite]
 *
 *   pnpm vitest run r2-azure.live
 */
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { StorageProvider } from '../core/StorageProvider';
import { AzureBlobStorageProvider, R2StorageProvider } from '../providers';

const env = process.env;

async function exercise(provider: StorageProvider): Promise<void> {
  const key = `tenant/live-test/folder/root/file/${randomUUID()}/original`;
  const payload = new Uint8Array(Buffer.from(`maw storage live test ${Date.now()}`));
  await provider.verifyAccess();

  const up = await provider.createUploadUrl({ key, contentType: 'text/plain', contentLength: payload.length, expiresInSeconds: 120 });
  const put = await fetch(up.url, { method: up.method, headers: up.headers, body: payload });
  expect(put.status, await put.clone().text()).toBeGreaterThanOrEqual(200);
  expect(put.status).toBeLessThan(300);

  expect(await provider.objectExists({ key })).toBe(true);
  const meta = await provider.getObjectMetadata({ key });
  expect(meta.size).toBe(payload.length);
  expect(meta.contentType).toBe('text/plain');

  const dl = await provider.createDownloadUrl({ key, fileName: 'live.txt', contentType: 'text/plain', disposition: 'attachment', expiresInSeconds: 120 });
  const got = await fetch(dl.url);
  expect(got.status).toBe(200);
  expect(Buffer.from(await got.arrayBuffer()).equals(Buffer.from(payload))).toBe(true);
  expect(got.headers.get('content-disposition')).toContain('attachment');

  await provider.deleteObject({ key });
  await provider.deleteObject({ key });
  expect(await provider.objectExists({ key })).toBe(false);
  await expect(provider.getObjectMetadata({ key })).rejects.toMatchObject({ reason: 'STORAGE_OBJECT_NOT_FOUND' });
}

describe.skipIf(!env['STORAGE_TEST_R2_BUCKET'])('Cloudflare R2 (live)', () => {
  it('uploads, verifies, downloads and deletes through signed URLs', async () => {
    await exercise(
      new R2StorageProvider({
        configId: 'live', tenantId: 'live-test', providerType: 'r2', bucketName: env['STORAGE_TEST_R2_BUCKET']!, region: 'auto',
        endpoint: `https://${env['STORAGE_TEST_R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`, basePath: 'maw-storage-live-test',
        credentials: { accessKeyId: env['STORAGE_TEST_R2_ACCESS_KEY_ID']!, secretAccessKey: env['STORAGE_TEST_R2_SECRET_ACCESS_KEY']! },
      }),
    );
  });
});

describe.skipIf(!env['STORAGE_TEST_AZURE_CONTAINER'])('Azure Blob Storage (live)', () => {
  it('uploads, verifies, downloads and deletes through SAS URLs', async () => {
    await exercise(
      new AzureBlobStorageProvider({
        configId: 'live', tenantId: 'live-test', providerType: 'azure', bucketName: env['STORAGE_TEST_AZURE_CONTAINER']!, region: null,
        endpoint: env['STORAGE_TEST_AZURE_ENDPOINT'] ?? null, basePath: 'maw-storage-live-test',
        credentials: { accessKeyId: env['STORAGE_TEST_AZURE_ACCOUNT']!, secretAccessKey: env['STORAGE_TEST_AZURE_KEY']! },
      }),
    );
  });
});
