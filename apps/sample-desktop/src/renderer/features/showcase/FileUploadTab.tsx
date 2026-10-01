import type { ReactNode } from 'react';
import { Card, Stack, FileUpload, useToast } from '@mawsoftwares/ui-web';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';
import { client } from '../../api';

export function FileUploadTab(): ReactNode {
  const toast = useToast();

  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>File Upload</h3>
        <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)', marginBottom: 'var(--maw-space-md)' }}>
          Drag-and-drop or click to upload. Images show a preview thumbnail. Supports progress tracking and retry on failure.
        </p>
        <FileUpload
          upload={async (file, onProgress) => {
            const formData = new FormData();
            formData.append('files', file);
            onProgress(10);
            const result = await client.upload<{ files: StoredFile[] }>('/files/upload', formData, {
              onProgress: (e) => onProgress(e.percent),
            });
            return result.files[0]!;
          }}
          onComplete={(files) => toast.success(`${files.length} file(s) uploaded`)}
          onError={(_file, error) => toast.error(error)}
          accept={['image/*', '.pdf', '.csv']}
          maxSize={10 * 1024 * 1024}
          maxFiles={5}
          label="Upload Files"
          hint="Images, PDFs, and CSV files up to 10 MB each (max 5 files)"
        />
      </Card>
    </Stack>
  );
}
