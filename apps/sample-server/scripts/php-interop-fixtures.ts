/**
 * Regenerates backend-php/tests/Fixtures/node-interop.json from the REAL Node code and SDKs.
 * The PHP suite (tests/Unit/Storage/NodeInteropTest.php) must reproduce every value here byte for byte —
 * that is what proves both backends can read each other's credentials, accept each other's signed local
 * tokens, and issue interchangeable S3 / Azure signed URLs.
 *
 *   cd apps/sample-server && node --import=tsx scripts/php-interop-fixtures.ts
 *
 * Signing times and keys are fixed, so everything except the AES ciphertext (random IV) is reproducible.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { BlobServiceClient, BlobSASPermissions, ContainerSASPermissions, SASProtocol, StorageSharedKeyCredential } from '@azure/storage-blob';
import { AesEncryptionService } from '@mawsoftwares/platform/security/AesEncryptionService';
import { LocalUrlSigner } from '../src/modules/storage/providers/local/LocalUrlSigner';
import { S3StorageProvider } from '../src/modules/storage/providers/s3/S3StorageProvider';

const OUT = path.resolve(import.meta.dirname, '../../../backend-php/tests/Fixtures/node-interop.json');
const START = new Date('2026-10-06T07:00:00Z');
const KEY = 'tenant/t1/folder/root/file/00000000-0000-4000-8000-000000000001/original';
const ACCOUNT = 'mawstorage';
const AZURE_KEY = Buffer.from('k'.repeat(32)).toString('base64');

const fixtures: Record<string, unknown> = { key: KEY };

// 1. AES-256-GCM credential cipher (`v1:iv:data:tag`)
const plain = JSON.stringify({ accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'sec/ret+value==' });
fixtures['cipher'] = { keyHex: '11'.repeat(32), plain, ciphertext: await new AesEncryptionService('11'.repeat(32)).encrypt(plain) };

// 2. Local signed tokens
const secret = 'interop-signing-secret-123456';
const signer = new LocalUrlSigner(secret);
fixtures['localToken'] = {
  secret,
  token: signer.sign({ tenantId: 't1', configId: 'c1', key: KEY, op: 'put', exp: 4102444800, contentType: 'application/pdf', contentLength: 1234 }),
  getToken: signer.sign({ tenantId: 't1', configId: 'c1', key: KEY, op: 'get', exp: 4102444800, contentType: 'image/png', fileName: 'héllo "x".png', disposition: 'inline' }),
};

// 3. Azure service SAS (version pinned to the one the PHP implementation signs with)
const container = new BlobServiceClient(`https://${ACCOUNT}.blob.core.windows.net`, new StorageSharedKeyCredential(ACCOUNT, AZURE_KEY)).getContainerClient('client-files');
const blob = container.getBlockBlobClient(`maw/prod/${KEY}`);
const expires = new Date(START.getTime() + 900_000);
const common = { startsOn: new Date(START.getTime() - 300_000), version: '2022-11-02', protocol: SASProtocol.Https };
fixtures['azure'] = {
  account: ACCOUNT, keyBase64: AZURE_KEY, container: 'client-files', blobName: `maw/prod/${KEY}`,
  startsAt: Math.floor(START.getTime() / 1000) - 300, expiresAt: Math.floor(expires.getTime() / 1000),
  upload: await blob.generateSasUrl({ ...common, expiresOn: expires, permissions: BlobSASPermissions.parse('cw') }),
  download: await blob.generateSasUrl({
    ...common, expiresOn: expires, permissions: BlobSASPermissions.parse('r'), contentType: 'application/pdf',
    contentDisposition: 'attachment; filename="Invoice 1.pdf"; filename*=UTF-8\'\'Invoice%201.pdf',
  }),
  containerList: await container.generateSasUrl({ ...common, expiresOn: expires, permissions: ContainerSASPermissions.parse('l') }),
};

// 4. S3 presigned PUT/GET issued by the real Node provider with the clock pinned
const s3 = new S3StorageProvider({
  configId: 'c1', tenantId: 't1', providerType: 's3', bucketName: 'client-files', region: 'ap-south-1', endpoint: null, basePath: 'maw/prod',
  credentials: { accessKeyId: 'AKIAEXAMPLEKEY12345', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
});
const RealDate = Date;
const fixed = Math.floor(START.getTime() / 1000) * 1000;
class FixedDate extends RealDate {
  constructor(...args: unknown[]) {
    super(...(args.length ? (args as [number]) : [fixed]));
  }
  static override now(): number {
    return fixed;
  }
}
(globalThis as { Date: DateConstructor }).Date = FixedDate as unknown as DateConstructor; // the SDK signs with `new Date()`
const put = await s3.createUploadUrl({ key: KEY, contentType: 'application/pdf', contentLength: 125000, expiresInSeconds: 900 });
const get = await s3.createDownloadUrl({ key: KEY, fileName: 'Invoice 1.pdf', contentType: 'application/pdf', disposition: 'attachment', expiresInSeconds: 300 });
(globalThis as { Date: DateConstructor }).Date = RealDate;
fixtures['s3'] = { signingTime: fixed / 1000, put: put.url, get: get.url };

writeFileSync(OUT, `${JSON.stringify(fixtures, null, 2)}\n`);
console.log(`wrote ${OUT}`);
