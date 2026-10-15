import type { ReactNode } from 'react';
import { UsersManager } from './ui';
import { client } from '../../api';
import { useAppConfig } from '../../config-context';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';

// Multipart upload with progress does not fit an RTK Query endpoint.
// List, get, and the user mutations go through the generated hooks in UsersManager.
async function uploadAvatar(file: File, onProgress: (percent: number) => void): Promise<StoredFile> {
  const formData = new FormData();
  formData.append('files', file);
  onProgress(10);
  const result = await client.upload<{ files: StoredFile[] }>('/files/upload', formData, {
    onProgress: (event) => onProgress(event.percent),
  });
  const uploaded = result.files[0];
  if (!uploaded) throw new Error('Upload returned no file');
  return uploaded;
}

export function UsersView(): ReactNode {
  const { formLayout } = useAppConfig();
  return <UsersManager formLayout={formLayout} uploadAvatar={uploadAvatar} />;
}
