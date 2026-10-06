/**
 * Opt-in contract test against a REAL S3 (or S3-compatible) bucket. Skipped unless
 * STORAGE_TEST_S3_BUCKET is set. Credentials come from STORAGE_TEST_S3_ACCESS_KEY_ID /
 * STORAGE_TEST_S3_SECRET_ACCESS_KEY, or the default AWS credential chain when those are unset.
 *
 *   STORAGE_TEST_S3_BUCKET=my-test-bucket STORAGE_TEST_S3_REGION=ap-south-1 \
 *   [STORAGE_TEST_S3_ENDPOINT=http://localhost:9000] pnpm vitest run s3.live
 *
 * Writes (and deletes) one small object under `maw-storage-live-test/`.
 */
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { S3StorageProvider } from '../providers';

const env = process.env;
const bucket = env['STORAGE_TEST_S3_BUCKET'];

describe.skipIf(!bucket)('S3StorageProvider against a real bucket', () => {
  const accessKeyId = env['STORAGE_TEST_S3_ACCESS_KEY_ID'];
  const secretAccessKey = env['STORAGE_TEST_S3_SECRET_ACCESS_KEY'];
  let provider: S3StorageProvider;
  beforeAll(() => {
    provider = new S3StorageProvider({
    configId: 'live',
    tenantId: 'live-test',
    providerType: 's3',
    bucketName: bucket!,
    region: env['STORAGE_TEST_S3_REGION'] ?? 'us-east-1',
    endpoint: env['STORAGE_TEST_S3_ENDPOINT'] ?? null,
    basePath: 'maw-storage-live-test',
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : null,
    });
  });
  const key = `tenant/live-test/folder/root/file/${randomUUID()}/original`;
  const payload = new Uint8Array(Buffer.from(`maw storage live test ${Date.now()}`));

  it('verifies bucket access', async () => {
    await expect(provider.verifyAccess()).resolves.toBeUndefined();
  });

  it('uploads via signed URL, verifies, downloads via signed URL, deletes', async () => {
    const up = await provider.createUploadUrl({ key, contentType: 'text/plain', contentLength: payload.length, expiresInSeconds: 120 });
    const put = await fetch(up.url, { method: up.method, headers: up.headers, body: payload });
    expect(put.status, await put.clone().text()).toBe(200);

    expect(await provider.objectExists({ key })).toBe(true);
    const meta = await provider.getObjectMetadata({ key });
    expect(meta.size).toBe(payload.length);
    expect(meta.contentType).toBe('text/plain');

    const dl = await provider.createDownloadUrl({ key, fileName: 'live.txt', contentType: 'text/plain', disposition: 'attachment', expiresInSeconds: 120 });
    const got = await fetch(dl.url);
    expect(got.status).toBe(200);
    expect(Buffer.from(await got.arrayBuffer()).equals(Buffer.from(payload))).toBe(true);
    expect(got.headers.get('content-disposition')).toContain('attachment');

    // A different size than the signed Content-Length must be rejected by S3 itself.
    const bad = await provider.createUploadUrl({ key: `${key}-bad`, contentType: 'text/plain', contentLength: 3, expiresInSeconds: 120 });
    expect((await fetch(bad.url, { method: 'PUT', headers: bad.headers, body: payload })).status).toBeGreaterThanOrEqual(400);
  });

  it('deletes idempotently and reports missing objects', async () => {
    await provider.deleteObject({ key });
    await provider.deleteObject({ key });
    expect(await provider.objectExists({ key })).toBe(false);
    await expect(provider.getObjectMetadata({ key })).rejects.toMatchObject({ reason: 'STORAGE_OBJECT_NOT_FOUND' });
  });
});
