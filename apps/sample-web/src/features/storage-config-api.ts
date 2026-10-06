import type { ApiSuccessResponse } from '@mawsoftwares/api/response/types';
import { client } from '../api';

const BASE = '/api/v1/storage';

// --- Admin: storage configurations (permission Manage_StorageConfiguration) -----------------

export interface StorageConfiguration {
  id: string;
  provider: 'local' | 's3';
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
  provider?: 'local' | 's3';
  name: string;
  bucket?: string | null;
  region?: string | null;
  endpoint?: string | null;
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
