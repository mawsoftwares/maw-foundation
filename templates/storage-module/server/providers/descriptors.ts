import type { ProviderDescriptor, ProviderSettingsInput, StoredProviderSettings } from '../core/StorageProviderDescriptor';
import { storageErrors } from '../core/storage.errors';

const clean = (v: string | null | undefined): string | null => (v && v.trim().length > 0 ? v.trim() : null);

function need(value: string | null, label: string): string {
  if (!value) throw storageErrors.invalidInput(`${label} is required`);
  return value;
}

export const LOCAL_DESCRIPTOR: ProviderDescriptor = {
  type: 'local',
  label: 'Local disk (server)',
  description: 'Files are stored on the MAW server disk. Best for development and self-hosted installs.',
  fields: [{ name: 'basePath', label: 'Sub-folder under the storage root', required: false, placeholder: 'tenant-files' }],
  credentials: null,
  normalize: (): StoredProviderSettings => ({ bucket: null, region: null, endpoint: null }),
};

export const S3_DESCRIPTOR: ProviderDescriptor = {
  type: 's3',
  label: 'Amazon S3 / S3-compatible',
  description: 'AWS S3, or any S3-compatible store (MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi) via a custom endpoint.',
  fields: [
    { name: 'bucket', label: 'Bucket', required: true, placeholder: 'client-files' },
    { name: 'region', label: 'Region', required: true, placeholder: 'ap-south-1' },
    { name: 'endpoint', label: 'Endpoint (only for S3-compatible stores)', required: false, placeholder: 'https://…' },
    { name: 'basePath', label: 'Base path (folder prefix inside the bucket)', required: false, placeholder: 'maw/prod' },
  ],
  credentials: {
    required: false,
    accessKeyLabel: 'Access key ID',
    secretLabel: 'Secret access key',
    help: 'Leave blank to use the server’s own AWS credentials (instance role, environment).',
  },
  normalize: (input: ProviderSettingsInput): StoredProviderSettings => ({
    bucket: need(clean(input.bucket), 'Bucket'),
    region: need(clean(input.region), 'Region'),
    endpoint: clean(input.endpoint),
  }),
};

export const R2_DESCRIPTOR: ProviderDescriptor = {
  type: 'r2',
  label: 'Cloudflare R2',
  description: 'Cloudflare R2 object storage (S3 API, no egress fees).',
  fields: [
    {
      name: 'accountId',
      label: 'Cloudflare account ID',
      required: true,
      placeholder: '32-character account id',
      help: 'Cloudflare dashboard → R2 → account ID.',
      prefillFromEndpoint: '^https://([^./]+)(?:\\.[a-z]+)?\\.r2\\.cloudflarestorage\\.com',
    },
    { name: 'bucket', label: 'Bucket', required: true, placeholder: 'client-files' },
    { name: 'endpoint', label: 'Custom endpoint (EU / FedRAMP jurisdictions only)', required: false, placeholder: 'https://<account>.eu.r2.cloudflarestorage.com' },
    { name: 'basePath', label: 'Base path (folder prefix inside the bucket)', required: false, placeholder: 'maw/prod' },
  ],
  credentials: {
    required: true,
    accessKeyLabel: 'R2 access key ID',
    secretLabel: 'R2 secret access key',
    help: 'Create an R2 API token with Object Read & Write on this bucket.',
  },
  normalize: (input: ProviderSettingsInput): StoredProviderSettings => {
    const accountId = clean(input.accountId);
    const endpoint = clean(input.endpoint) ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
    if (accountId && !/^[A-Za-z0-9-]{8,64}$/.test(accountId)) throw storageErrors.invalidInput('Cloudflare account ID is not valid');
    return { bucket: need(clean(input.bucket), 'Bucket'), region: 'auto', endpoint: need(endpoint, 'Cloudflare account ID') };
  },
};

export const AZURE_DESCRIPTOR: ProviderDescriptor = {
  type: 'azure',
  label: 'Azure Blob Storage',
  description: 'Microsoft Azure Blob Storage with SAS (shared access signature) URLs.',
  fields: [
    { name: 'bucket', label: 'Container name', required: true, placeholder: 'client-files' },
    { name: 'endpoint', label: 'Blob endpoint (optional — Azurite / sovereign clouds)', required: false, placeholder: 'https://<account>.blob.core.windows.net' },
    { name: 'basePath', label: 'Base path (folder prefix inside the container)', required: false, placeholder: 'maw/prod' },
  ],
  credentials: {
    required: true,
    accessKeyLabel: 'Storage account name',
    secretLabel: 'Account key',
    help: 'Azure portal → Storage account → Security + networking → Access keys.',
  },
  normalize: (input: ProviderSettingsInput): StoredProviderSettings => ({
    bucket: need(clean(input.bucket), 'Container name'),
    region: null,
    endpoint: clean(input.endpoint),
  }),
};
