// Framework-light adapter between the storage UI components and the MAW Storage HTTP API.
// Components depend only on the `StorageApi` interface, so any project can plug in its own
// transport (fetch, axios, a mock) via `createStorageApi(request)`.

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

export interface UploadTicket {
  fileId: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface UploadRequest {
  name: string;
  type: string;
  size: number;
}

export type Disposition = 'attachment' | 'inline';

export interface StorageApi {
  listFolders(parentId: string | null): Promise<StorageFolder[]>;
  listFiles(folderId: string | null, search?: string): Promise<StorageFile[]>;
  createFolder(name: string, parentId: string | null): Promise<void>;
  deleteFolder(id: string): Promise<void>;
  deleteFile(id: string): Promise<void>;
  getDownloadUrl(fileId: string, disposition: Disposition): Promise<string>;
  /** Step 1 of the direct-upload flow: ask MAW for a signed URL. */
  requestUpload(file: UploadRequest, folderId: string | null): Promise<UploadTicket>;
  /** Step 3: ask MAW to verify the uploaded object. */
  completeUpload(fileId: string): Promise<StorageFile>;
}

/** Any authenticated JSON transport that resolves with the parsed response body. */
export type RequestFn = (path: string, init?: { method?: string; body?: string }) => Promise<unknown>;

interface Envelope<T> {
  data: T;
}

const PAGE = 'page=1&pageSize=100';
const ref = (id: string | null): string => id ?? 'root';

export function createStorageApi(request: RequestFn, basePath = '/api/v1/storage'): StorageApi {
  const get = async <T>(path: string): Promise<T> => ((await request(`${basePath}${path}`)) as Envelope<T>).data;
  const send = (path: string, method: string, body?: unknown): Promise<unknown> =>
    request(`${basePath}${path}`, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

  return {
    listFolders: (parentId) => get<StorageFolder[]>(`/folders?parentId=${ref(parentId)}&${PAGE}`),
    listFiles: (folderId, search) =>
      get<StorageFile[]>(`/folders/${ref(folderId)}/files?${PAGE}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    createFolder: async (name, parentId) => void (await send('/folders', 'POST', { name, parentId })),
    deleteFolder: async (id) => void (await send(`/folders/${id}`, 'DELETE')),
    deleteFile: async (id) => void (await send(`/files/${id}`, 'DELETE')),
    getDownloadUrl: async (fileId, disposition) =>
      (await get<{ url: string }>(`/files/${fileId}/download-url?disposition=${disposition}`)).url,
    requestUpload: async (file, folderId) =>
      ((await send('/uploads', 'POST', {
        folderId,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      })) as Envelope<UploadTicket>).data,
    completeUpload: async (fileId) => ((await send(`/uploads/${fileId}/complete`, 'POST')) as Envelope<StorageFile>).data,
  };
}

/**
 * Step 2 of the direct-upload flow: send the bytes straight to the storage provider.
 * Uses XMLHttpRequest because `fetch` cannot report upload progress.
 */
export function putWithProgress(
  ticket: UploadTicket,
  file: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method, ticket.uploadUrl);
    for (const [name, value] of Object.entries(ticket.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`The storage provider rejected the upload (${xhr.status})`));
    xhr.onerror = () => reject(new Error('Network error while uploading. Check your connection and the bucket CORS settings.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}
