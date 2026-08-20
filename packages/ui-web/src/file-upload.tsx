import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type DragEvent,
  type ChangeEvent,
  type CSSProperties,
} from 'react';
import type { StoredFile } from '@maw/sdk/contracts/IFileStorage';
import { formatFileSize, getMimeType, isImageFile, sanitizeFilename } from '@maw/sdk/kernel/file';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface FileEntry {
  readonly id: string;
  readonly file: File;
  readonly preview?: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: StoredFile;
}

export interface FileUploadConfig {
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
}

export interface UseFileUploadOptions extends FileUploadConfig {
  upload: (file: File, onProgress: (percent: number) => void) => Promise<StoredFile>;
  onComplete?: (files: StoredFile[]) => void;
  onError?: (file: File, error: string) => void;
}

export interface UseFileUploadReturn {
  files: readonly FileEntry[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  retryFile: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
  isUploading: boolean;
  totalProgress: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateFile(
  file: File,
  config: FileUploadConfig,
  currentCount: number,
): string | null {
  if (config.maxSize && file.size > config.maxSize) {
    return `File too large (${formatFileSize(file.size)}). Max: ${formatFileSize(config.maxSize)}`;
  }
  if (config.accept && config.accept.length > 0) {
    const mime = getMimeType(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const matches = config.accept.some((a) => {
      if (a.startsWith('.')) return ext === a.slice(1).toLowerCase();
      if (a.endsWith('/*')) return mime.startsWith(a.slice(0, -1));
      return mime === a;
    });
    if (!matches) return `File type not allowed: .${ext}`;
  }
  if (config.maxFiles && currentCount >= config.maxFiles) {
    return `Maximum ${config.maxFiles} files allowed`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// useFileUpload hook
// ---------------------------------------------------------------------------

let entryIdCounter = 0;

export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
  const { upload, onComplete, onError, ...config } = options;
  const [files, setFiles] = useState<FileEntry[]>([]);
  const uploadRef = useRef(upload);
  uploadRef.current = upload;

  useEffect(() => {
    return () => {
      files.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const newEntries: FileEntry[] = [];
      const list = Array.from(incoming);

      setFiles((prev) => {
        let count = prev.length;
        for (const file of list) {
          const error = validateFile(file, config, count);
          if (error) {
            onError?.(file, error);
            continue;
          }
          const id = `upload-${++entryIdCounter}`;
          const preview = isImageFile(file.name) ? URL.createObjectURL(file) : undefined;
          const entry: FileEntry = {
            id,
            file,
            preview,
            status: 'idle',
            progress: 0,
          };
          newEntries.push(entry);
          count++;
        }
        return [...prev, ...newEntries];
      });

      // Start uploading after state settles
      setTimeout(() => {
        for (const entry of newEntries) {
          void uploadEntry(entry);
        }
      }, 0);
    },
    [config.accept?.join(','), config.maxSize, config.maxFiles, onError],
  );

  const uploadEntry = useCallback(
    async (entry: FileEntry) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' as const, progress: 0 } : f)),
      );

      try {
        const result = await uploadRef.current(entry.file, (percent) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === entry.id ? { ...f, progress: percent } : f)),
          );
        });

        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.id === entry.id ? { ...f, status: 'success' as const, progress: 100, result } : f,
          );
          const completed = updated.filter((f) => f.status === 'success' && f.result);
          if (onComplete && completed.length > 0) {
            onComplete(completed.map((f) => f.result!));
          }
          return updated;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: 'error' as const, error: message } : f)),
        );
        onError?.(entry.file, message);
      }
    },
    [onComplete, onError],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const retryFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const entry = prev.find((f) => f.id === id);
        if (entry && entry.status === 'error') {
          void uploadEntry(entry);
        }
        return prev;
      });
    },
    [uploadEntry],
  );

  const clearCompleted = useCallback(() => {
    setFiles((prev) => {
      prev.filter((f) => f.status === 'success' && f.preview).forEach((f) => URL.revokeObjectURL(f.preview!));
      return prev.filter((f) => f.status !== 'success');
    });
  }, []);

  const clearAll = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
      return [];
    });
  }, []);

  const isUploading = files.some((f) => f.status === 'uploading');
  const totalProgress =
    files.length > 0 ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length) : 0;

  return { files, addFiles, removeFile, retryFile, clearCompleted, clearAll, isUploading, totalProgress };
}

// ---------------------------------------------------------------------------
// FileUpload component
// ---------------------------------------------------------------------------

const base: CSSProperties = {
  fontFamily: 'var(--maw-fontFamily)',
  color: 'var(--maw-fg)',
};

export interface FileUploadProps extends FileUploadConfig {
  upload: (file: File, onProgress: (percent: number) => void) => Promise<StoredFile>;
  onComplete?: (files: StoredFile[]) => void;
  onError?: (file: File, error: string) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
  style?: CSSProperties;
}

export function FileUpload({
  upload,
  onComplete,
  onError,
  label,
  hint,
  disabled,
  compact,
  style,
  ...config
}: FileUploadProps): ReactNode {
  const { files, addFiles, removeFile, retryFile, clearCompleted, isUploading } = useFileUpload({
    upload,
    onComplete,
    onError,
    ...config,
  });

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setDragOver(e.type === 'dragover' || e.type === 'dragenter');
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (disabled || !e.dataTransfer.files.length) return;
      addFiles(e.dataTransfer.files);
    },
    [disabled, addFiles],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles],
  );

  const acceptStr = config.accept?.map((a) => (a.startsWith('.') ? a : `.${a}`)).join(',');

  return (
    <div style={{ ...base, ...style }}>
      {label && (
        <div style={{ fontWeight: 600, marginBottom: 'var(--maw-space-xs)', fontSize: 'var(--maw-text-sm)' }}>
          {label}
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--maw-brand)' : 'var(--maw-border)'}`,
          borderRadius: 'var(--maw-radius-lg)',
          padding: compact ? 'var(--maw-space-md)' : 'var(--maw-space-xl) var(--maw-space-lg)',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          background: dragOver ? 'var(--maw-brandLight, rgba(99,102,241,0.08))' : 'var(--maw-bgSubtle)',
          transition: 'var(--maw-transition-fast)',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept={acceptStr}
          multiple={config.multiple !== false}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: compact ? 20 : 32, marginBottom: 'var(--maw-space-xs)' }}>
          {isUploading ? '⏳' : '📁'}
        </div>
        <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 500 }}>
          {isUploading ? 'Uploading...' : 'Drop files here or click to browse'}
        </div>
        {hint && (
          <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 'var(--maw-space-xs)' }}>
            {hint}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 'var(--maw-space-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--maw-space-xs)' }}>
            <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
              {files.length} file{files.length !== 1 ? 's' : ''}
            </span>
            {files.some((f) => f.status === 'success') && (
              <button
                onClick={clearCompleted}
                style={{
                  ...base,
                  background: 'none',
                  border: 'none',
                  color: 'var(--maw-brand)',
                  cursor: 'pointer',
                  fontSize: 'var(--maw-text-xs)',
                  padding: 0,
                }}
              >
                Clear completed
              </button>
            )}
          </div>

          {files.map((entry) => (
            <FileEntryRow key={entry.id} entry={entry} onRemove={removeFile} onRetry={retryFile} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileEntryRow
// ---------------------------------------------------------------------------

function FileEntryRow({
  entry,
  onRemove,
  onRetry,
}: {
  entry: FileEntry;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}): ReactNode {
  const statusColor: Record<UploadStatus, string> = {
    idle: 'var(--maw-fgMuted)',
    uploading: 'var(--maw-brand)',
    success: 'var(--maw-success)',
    error: 'var(--maw-danger)',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--maw-space-sm)',
        padding: 'var(--maw-space-sm)',
        borderRadius: 'var(--maw-radius-md)',
        border: '1px solid var(--maw-border)',
        marginBottom: 'var(--maw-space-xs)',
        background: 'var(--maw-bg)',
      }}
    >
      {entry.preview ? (
        <img
          src={entry.preview}
          alt={entry.file.name}
          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--maw-radius-sm)' }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--maw-bgSubtle)',
            borderRadius: 'var(--maw-radius-sm)',
            fontSize: 18,
          }}
        >
          📄
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--maw-text-sm)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--maw-fg)',
          }}
        >
          {sanitizeFilename(entry.file.name)}
        </div>
        <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
          {formatFileSize(entry.file.size)}
          {entry.error && <span style={{ color: 'var(--maw-danger)', marginLeft: 8 }}>{entry.error}</span>}
        </div>

        {entry.status === 'uploading' && (
          <div
            style={{
              marginTop: 4,
              height: 3,
              background: 'var(--maw-border)',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${entry.progress}%`,
                background: 'var(--maw-brand)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {entry.status === 'uploading' && (
          <span style={{ fontSize: 'var(--maw-text-xs)', color: statusColor[entry.status] }}>
            {entry.progress}%
          </span>
        )}
        {entry.status === 'success' && (
          <span style={{ fontSize: 14, color: statusColor.success }}>✓</span>
        )}
        {entry.status === 'error' && (
          <button
            onClick={() => onRetry(entry.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              color: 'var(--maw-brand)',
              padding: '2px 4px',
            }}
            title="Retry"
          >
            ↻
          </button>
        )}
        <button
          onClick={() => onRemove(entry.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            color: 'var(--maw-fgMuted)',
            padding: '2px 4px',
          }}
          title="Remove"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
