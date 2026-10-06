import { useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { Button, IconButton, Progress, useIsMobile } from '@mawsoftwares/ui-web';
import { formatBytes, type StorageApi, type StorageFile } from './api';
import { iconOf, kindOf } from './fileTypes';
import { useUploadQueue, type UploadItem, type UploadQueue } from './useUploadQueue';

const STATUS_TEXT: Record<UploadItem['status'], string> = {
  queued: 'Waiting…',
  uploading: 'Uploading',
  completing: 'Verifying…',
  done: 'Uploaded',
  error: 'Failed',
};

export interface UploadPanelProps {
  queue: UploadQueue;
  accept?: string;
  maxSizeBytes?: number;
  multiple?: boolean;
  /** Shown inside the drop zone. */
  hint?: string;
  style?: CSSProperties;
}

/** Drop zone + per-file progress list for an existing queue (see `useUploadQueue`). */
export function UploadPanel({ queue, accept, maxSizeBytes, multiple = true, hint, style }: UploadPanelProps): ReactNode {
  const isMobile = useIsMobile();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (list: FileList | null): void => {
    const picked = Array.from(list ?? []);
    if (picked.length > 0) queue.add(multiple ? picked : picked.slice(0, 1));
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files);
  };

  const finished = queue.items.some((i) => i.status === 'done');
  const limits = [accept ? `Allowed: ${accept}` : null, maxSizeBytes ? `Max ${formatBytes(maxSizeBytes)} per file` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div style={style}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose files to upload"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${over ? 'var(--maw-brand)' : 'var(--maw-border)'}`,
          background: over ? 'var(--maw-infoBg)' : 'var(--maw-bgMuted)',
          borderRadius: 'var(--maw-radius-lg)',
          padding: isMobile ? 'var(--maw-space-lg)' : 'var(--maw-space-xl)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'background 120ms, border-color 120ms',
        }}
      >
        <div style={{ fontSize: 32, lineHeight: 1 }} aria-hidden>☁️</div>
        <div style={{ marginTop: 'var(--maw-space-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>
          {isMobile ? 'Tap to choose files' : 'Drag & drop files here, or click to browse'}
        </div>
        <div style={{ marginTop: 4, fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{hint ?? limits}</div>
        <input
          ref={input}
          type="file"
          hidden
          multiple={multiple}
          accept={accept}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {queue.items.length > 0 && (
        <div style={{ marginTop: 'var(--maw-space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--maw-space-xs)' }}>
            <span style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
              {queue.items.length} file{queue.items.length === 1 ? '' : 's'}
            </span>
            {finished && <Button variant="ghost" onClick={queue.clearFinished}>Clear completed</Button>}
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--maw-space-sm)' }}>
            {queue.items.map((item) => (
              <UploadRow key={item.id} item={item} queue={queue} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadRow({ item, queue }: { item: UploadItem; queue: UploadQueue }): ReactNode {
  const failed = item.status === 'error';
  const inFlight = item.status === 'queued' || item.status === 'uploading' || item.status === 'completing';
  const color = failed ? 'var(--maw-danger)' : item.status === 'done' ? 'var(--maw-success)' : 'var(--maw-fgMuted)';
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--maw-space-sm)',
        padding: 'var(--maw-space-sm) var(--maw-space-md)',
        border: '1px solid var(--maw-border)',
        borderRadius: 'var(--maw-radius-md)',
        background: 'var(--maw-surface)',
      }}
    >
      <span style={{ fontSize: 22 }} aria-hidden>{iconOf(kindOf(item.file.type, item.file.name))}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--maw-fg)' }}>{item.file.name}</div>
        <div style={{ fontSize: 'var(--maw-text-xs)', color }}>
          {formatBytes(item.file.size)} · {failed ? item.error : item.status === 'uploading' ? `${Math.round(item.progress * 100)}%` : STATUS_TEXT[item.status]}
        </div>
        {inFlight && <Progress value={item.status === 'queued' ? 0 : item.progress * 100} height={4} style={{ marginTop: 6 }} />}
      </div>
      {failed && item.error !== 'File is empty' && !item.error?.startsWith('Too large') && !item.error?.startsWith('This file type') && (
        <Button variant="ghost" onClick={() => queue.retry(item.id)}>Retry</Button>
      )}
      {inFlight ? (
        <IconButton label="Cancel upload" onClick={() => queue.cancel(item.id)}>✕</IconButton>
      ) : (
        <IconButton label="Remove from list" onClick={() => queue.remove(item.id)}>✕</IconButton>
      )}
    </li>
  );
}

export interface FileUploaderProps extends Omit<UploadPanelProps, 'queue'> {
  api: StorageApi;
  /** Destination folder id; `null` = root. */
  folderId?: string | null;
  concurrency?: number;
  onUploaded?: (file: StorageFile) => void;
}

/**
 * Drop-in uploader: drag & drop or tap to choose, per-file progress, cancel, retry,
 * client-side size/type checks. Files go straight to the storage provider.
 *
 *   <FileUploader api={api} folderId={folderId} accept="image/*,.pdf" maxSizeBytes={10_000_000}
 *                 onUploaded={(file) => attach(file.id)} />
 */
export function FileUploader({ api, folderId = null, concurrency, onUploaded, ...panel }: FileUploaderProps): ReactNode {
  const queue = useUploadQueue({ api, folderId, concurrency, onUploaded, maxSizeBytes: panel.maxSizeBytes, accept: panel.accept });
  return <UploadPanel queue={queue} {...panel} />;
}
