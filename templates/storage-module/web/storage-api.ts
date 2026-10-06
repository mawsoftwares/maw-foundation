import type { ApiSuccessResponse } from '@mawsoftwares/api/response/types';
import { client } from '../api' // your ApiClient instance;

// Typed wrapper over /api/v1/storage. Nothing here is browser-specific except `File`, so the
// same flow works from React Native by passing a Blob/fetch-compatible body to `uploadFile`.

export interface StorageFolder {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
}

export interface StorageFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  status: string;
  createdAt: string;
}

interface UploadTicket {
  fileId: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

const BASE = '/api/v1/storage';
const PAGE = 'page=1&pageSize=100';

function folderRef(id: string | null): string {
  return id ?? 'root';
}

export async function listFolders(parentId: string | null): Promise<StorageFolder[]> {
  const r = await client.request<ApiSuccessResponse<StorageFolder[]>>(`${BASE}/folders?parentId=${folderRef(parentId)}&${PAGE}`);
  return r.data;
}

export async function listFiles(folderId: string | null, search?: string): Promise<StorageFile[]> {
  const q = search ? `&search=${encodeURIComponent(search)}` : '';
  const r = await client.request<ApiSuccessResponse<StorageFile[]>>(`${BASE}/folders/${folderRef(folderId)}/files?${PAGE}${q}`);
  return r.data;
}

export async function createFolder(name: string, parentId: string | null): Promise<void> {
  await client.request(`${BASE}/folders`, { method: 'POST', body: JSON.stringify({ name, parentId }) });
}

export async function deleteFolder(id: string): Promise<void> {
  await client.request(`${BASE}/folders/${id}`, { method: 'DELETE' });
}

export async function deleteFile(id: string): Promise<void> {
  await client.request(`${BASE}/files/${id}`, { method: 'DELETE' });
}

export async function getDownloadUrl(id: string, disposition: 'attachment' | 'inline'): Promise<string> {
  const r = await client.request<ApiSuccessResponse<{ url: string }>>(`${BASE}/files/${id}/download-url?disposition=${disposition}`);
  return r.data.url;
}

/** request URL → PUT bytes directly to the provider → complete. The MAW server never sees the bytes. */
export async function uploadFile(file: File, folderId: string | null): Promise<StorageFile> {
  const ticket = await client.request<ApiSuccessResponse<UploadTicket>>(`${BASE}/uploads`, {
    method: 'POST',
    body: JSON.stringify({
      folderId,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size,
    }),
  });
  const { fileId, uploadUrl, method, headers } = ticket.data;
  const put = await fetch(uploadUrl, { method, headers, body: file });
  if (!put.ok) throw new Error(`Upload to storage failed (${put.status})`);
  const done = await client.request<ApiSuccessResponse<StorageFile>>(`${BASE}/uploads/${fileId}/complete`, { method: 'POST' });
  return done.data;
}

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
