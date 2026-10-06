import { useMemo, type ReactNode } from 'react';
import { useDynamicAccess, useToast } from '@mawsoftwares/ui-web';
import { client } from '../api';
import { StorageManager, createStorageApi } from './storage';

/** Sample-web page: wires the reusable StorageManager to this app's API client and RBAC. */
export function StorageView(): ReactNode {
  const toast = useToast();
  const { can } = useDynamicAccess();
  const api = useMemo(() => createStorageApi((path, init) => client.request(path, init)), []);
  const notify = useMemo(() => ({ success: toast.success, error: toast.error }), [toast.success, toast.error]);

  return (
    <StorageManager
      api={api}
      notify={notify}
      can={{
        upload: can('Upload_Storage'),
        download: can('Download_Storage'),
        createFolder: can('Create_StorageFolders'),
        deleteFile: can('Delete_StorageFiles'),
        deleteFolder: can('Delete_StorageFolders'),
      }}
    />
  );
}
