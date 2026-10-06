import type { ApiSuccessResponse } from '@mawsoftwares/api/response/types';
import { client } from '../api';

const BASE = '/api/v1/storage';

// --- Admin: storage configurations (permission Manage_StorageConfiguration) -----------------

export interface StorageConfiguration {
  id: string;
  provider: string;
  name: string;
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  basePath: string;
  hasCredentials: boolean;
  isDefault: boolean;
  isActive: boolean;
}

export interface ConfigurationInput {
  provider?: string;
  name: string;
  bucket?: string | null;
  region?: string | null;
  endpoint?: string | null;
  accountId?: string | null;
  basePath?: string | null;
  /** Omit to keep existing credentials (update) or use the server's AWS credential chain (create). */
  credentials?: { accessKeyId: string; secretAccessKey: string };
  isDefault?: boolean;
  isActive?: boolean;
}

export async function listConfigurations(): Promise<StorageConfiguration[]> {
  const r = await client.request<ApiSuccessResponse<StorageConfiguration[]>>(`${BASE}/configurations`);
  return r.data;
}

export async function createConfiguration(input: ConfigurationInput): Promise<void> {
  await client.request(`${BASE}/configurations`, { method: 'POST', body: JSON.stringify(input) });
}

export async function updateConfiguration(id: string, input: Partial<ConfigurationInput>): Promise<void> {
  await client.request(`${BASE}/configurations/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteConfiguration(id: string): Promise<void> {
  await client.request(`${BASE}/configurations/${id}`, { method: 'DELETE' });
}

export async function testConfiguration(id: string): Promise<{ ok: boolean; message: string }> {
  const r = await client.request<ApiSuccessResponse<{ ok: boolean; message: string }>>(`${BASE}/configurations/${id}/test`, { method: 'POST' });
  return r.data;
}

export type ConfigFieldName = 'bucket' | 'region' | 'endpoint' | 'accountId' | 'basePath';

export interface ProviderField {
  name: ConfigFieldName;
  label: string;
  required: boolean;
  placeholder?: string;
  help?: string;
  prefillFromEndpoint?: string;
}

export interface ProviderInfo {
  type: string;
  label: string;
  description: string;
  fields: ProviderField[];
  credentials: { required: boolean; accessKeyLabel: string; secretLabel: string; help?: string } | null;
}

/** Providers the server supports and the settings each one needs — the form is built from this. */
export async function listProviders(): Promise<ProviderInfo[]> {
  const r = await client.request<ApiSuccessResponse<ProviderInfo[]>>(`${BASE}/providers`);
  return r.data;
}
