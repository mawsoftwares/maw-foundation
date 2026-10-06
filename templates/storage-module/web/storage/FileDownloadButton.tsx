import { useState, type ReactNode } from 'react';
import { Button } from '@mawsoftwares/ui-web';
import type { Disposition, StorageApi } from './api';

export interface FileDownloadButtonProps {
  api: StorageApi;
  fileId: string;
  label?: string;
  /** `attachment` saves the file; `inline` opens it in a new tab (images, PDFs). */
  disposition?: Disposition;
  variant?: 'primary' | 'ghost';
  onError?: (message: string) => void;
}

/** Fetches a fresh short-lived signed URL on click, so links never go stale. */
export function FileDownloadButton({
  api,
  fileId,
  label = 'Download',
  disposition = 'attachment',
  variant = 'ghost',
  onError,
}: FileDownloadButtonProps): ReactNode {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant={variant}
      loading={loading}
      disabled={loading}
      onClick={() => {
        setLoading(true);
        api
          .getDownloadUrl(fileId, disposition)
          .then((url) => {
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.click();
          })
          .catch((e: Error) => onError?.(e.message))
          .finally(() => setLoading(false));
      }}
    >
      {label}
    </Button>
  );
}
