import type { ModuleDefinition } from '@mawsoftwares/rbac-core';
import { STORAGE_PERMISSIONS as P, STORAGE_ROUTE_PREFIX } from './core/storage.constants';

export const storageModule: ModuleDefinition = {
  key: 'storage',
  name: 'Storage',
  description: 'Provider-agnostic file storage with folders, signed uploads and downloads',
  routePrefix: STORAGE_ROUTE_PREFIX,
  audience: 'shared',
  permissions: [
    { code: P.view, name: 'Read Storage', description: 'View folders and file metadata' },
    { code: P.upload, name: 'Upload Storage', description: 'Upload files and attach them to records' },
    { code: P.download, name: 'Download Storage', description: 'Generate download links for files' },
    { code: P.createFolder, name: 'Create Storage Folders', description: 'Create folders' },
    { code: P.updateFolder, name: 'Update Storage Folders', description: 'Rename or move folders' },
    { code: P.deleteFolder, name: 'Delete Storage Folders', description: 'Delete folders' },
    { code: P.deleteFile, name: 'Delete Storage Files', description: 'Delete files and attachments' },
    { code: P.manageConfiguration, name: 'Manage Storage Configuration', description: 'Configure storage providers and credentials' },
  ],
};
