import type { RequestHandler } from 'express';
import { createApiRouter } from '@mawsoftwares/server-express';
import { STORAGE_PERMISSIONS as P, STORAGE_ROUTE_PREFIX } from './core/storage.constants';
import type {
  StorageConfigurationController,
  StorageFileController,
  StorageFolderController,
  StorageUploadController,
} from './controllers';

export interface StorageRouterDeps {
  readonly requireAuth: RequestHandler;
  readonly requirePermission: (perm: string) => RequestHandler;
}

export interface StorageControllers {
  readonly uploads: StorageUploadController;
  readonly files: StorageFileController;
  readonly folders: StorageFolderController;
  readonly configurations: StorageConfigurationController;
}

export function createStorageRouter(c: StorageControllers, deps: StorageRouterDeps) {
  const { router, get, post, patch, delete: destroy } = createApiRouter({ version: 'v1', prefix: STORAGE_ROUTE_PREFIX });
  const guard = (perm: string) => [deps.requireAuth, deps.requirePermission(perm)];
  const tags = ['storage'];

  // Uploads (direct-to-provider via signed URL)
  post('/uploads', c.uploads.requestUpload, { middleware: guard(P.upload), metadata: { summary: 'Request a signed upload URL', tags } });
  post('/uploads/:fileId/complete', c.uploads.completeUpload, { middleware: guard(P.upload), metadata: { summary: 'Verify and complete an upload', tags } });

  // Files
  get('/files/:fileId', c.files.getFile, { middleware: guard(P.view), metadata: { summary: 'Get file metadata', tags } });
  get('/files/:fileId/download-url', c.files.getDownloadUrl, { middleware: guard(P.download), metadata: { summary: 'Get a short-lived signed download URL', tags } });
  destroy('/files/:fileId', c.files.deleteFile, { middleware: guard(P.deleteFile), metadata: { summary: 'Delete a file', tags } });

  // Folders
  get('/folders', c.folders.list, { middleware: guard(P.view), metadata: { summary: 'List folders', tags } });
  post('/folders', c.folders.create, { middleware: guard(P.createFolder), metadata: { summary: 'Create a folder', tags } });
  patch('/folders/:id', c.folders.update, { middleware: guard(P.updateFolder), metadata: { summary: 'Rename or move a folder', tags } });
  destroy('/folders/:id', c.folders.remove, { middleware: guard(P.deleteFolder), metadata: { summary: 'Delete an empty folder', tags } });
  get('/folders/:id/files', c.files.listFolderFiles, { middleware: guard(P.view), metadata: { summary: 'List files in a folder (id or "root")', tags } });

  // Attachments (generic entity links)
  post('/attachments', c.files.attach, { middleware: guard(P.upload), metadata: { summary: 'Attach a file to an entity', tags } });
  get('/attachments', c.files.listAttachments, { middleware: guard(P.view), metadata: { summary: 'List attachments for an entity', tags } });
  destroy('/attachments/:id', c.files.detach, { middleware: guard(P.deleteFile), metadata: { summary: 'Remove an attachment', tags } });

  // Configuration (admin)
  get('/providers', c.configurations.providers, { middleware: guard(P.manageConfiguration), metadata: { summary: 'List supported storage providers and their settings', tags } });
  get('/configurations', c.configurations.list, { middleware: guard(P.manageConfiguration), metadata: { summary: 'List storage configurations', tags } });
  post('/configurations', c.configurations.create, { middleware: guard(P.manageConfiguration), metadata: { summary: 'Create a storage configuration', tags } });
  patch('/configurations/:id', c.configurations.update, { middleware: guard(P.manageConfiguration), metadata: { summary: 'Update a storage configuration', tags } });
  destroy('/configurations/:id', c.configurations.remove, { middleware: guard(P.manageConfiguration), metadata: { summary: 'Delete a storage configuration', tags } });
  post('/configurations/:id/test', c.configurations.test, { middleware: guard(P.manageConfiguration), metadata: { summary: 'Test a storage configuration', tags } });

  return router;
}
