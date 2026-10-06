import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Button,
  ConfirmationDialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FormField,
  IconButton,
  Modal,
  Spinner,
  TextField,
  useIsMobile,
} from '@mawsoftwares/ui-web';
import { formatBytes, type StorageApi, type StorageFile, type StorageFolder } from './api';
import { UploadPanel } from './FileUploader';
import { formatDate, iconOf, isPreviewable, kindOf } from './fileTypes';
import { useUploadQueue } from './useUploadQueue';

export interface StorageManagerPermissions {
  upload?: boolean;
  download?: boolean;
  createFolder?: boolean;
  deleteFile?: boolean;
  deleteFolder?: boolean;
}

export interface StorageManagerProps {
  api: StorageApi;
  /** Hide actions the current user may not perform. Everything is allowed by default. */
  can?: StorageManagerPermissions;
  title?: string;
  /** Same syntax as `<input accept>`. */
  accept?: string;
  maxSizeBytes?: number;
  /** Toast adapter, e.g. from `useToast()`. */
  notify?: { success(message: string): void; error(message: string): void };
}

type Entry =
  | { kind: 'folder'; id: string; name: string; folder: StorageFolder }
  | { kind: 'file'; id: string; name: string; file: StorageFile };

type SortKey = 'name' | 'newest' | 'largest';
type ViewMode = 'list' | 'grid';
interface Crumb {
  id: string | null;
  name: string;
}
interface PreviewState {
  file: StorageFile;
  url?: string;
  error?: string;
}

const ROOT: Crumb = { id: null, name: 'All files' };
const VIEW_KEY = 'maw.storage.view';

function loadView(): ViewMode {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const card: CSSProperties = {
  border: '1px solid var(--maw-border)',
  borderRadius: 'var(--maw-radius-md)',
  background: 'var(--maw-surface)',
};

/**
 * Full file manager: folders, breadcrumbs, search, sort, list/grid, drag & drop upload with
 * progress, preview, download and delete. Responsive — rows become touch-friendly on phones.
 * Bring your own transport via `createStorageApi(request)`.
 */
export function StorageManager({ api, can = {}, title = 'Files', accept, maxSizeBytes, notify }: StorageManagerProps): ReactNode {
  const allow = { upload: true, download: true, createFolder: true, deleteFile: true, deleteFolder: true, ...can };
  const isMobile = useIsMobile();

  const [trail, setTrail] = useState<Crumb[]>([ROOT]);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [view, setView] = useState<ViewMode>(loadView);
  const [showUploader, setShowUploader] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewState>();
  const [toDelete, setToDelete] = useState<Entry>();
  const [deleting, setDeleting] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const current = trail[trail.length - 1]!;
  const query = useDebounced(search.trim(), 300);
  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    Promise.all([api.listFolders(current.id), api.listFiles(current.id, query || undefined)])
      .then(([f, fl]) => {
        if (cancelled) return;
        setFolders(query ? f.filter((x) => x.name.toLowerCase().includes(query.toLowerCase())) : f);
        setFiles(fl);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [api, current.id, query, reloadTick]);

  const queue = useUploadQueue({
    api,
    folderId: current.id,
    accept,
    maxSizeBytes,
    onUploaded: () => {
      notify?.success('File uploaded');
      reload();
    },
  });

  const entries = useMemo<Entry[]>(() => {
    const sortedFiles = [...files].sort((a, b) =>
      sort === 'newest' ? b.createdAt.localeCompare(a.createdAt) : sort === 'largest' ? b.size - a.size : a.name.localeCompare(b.name),
    );
    return [
      ...[...folders].sort((a, b) => a.name.localeCompare(b.name)).map((folder): Entry => ({ kind: 'folder', id: folder.id, name: folder.name, folder })),
      ...sortedFiles.map((file): Entry => ({ kind: 'file', id: file.id, name: file.name, file })),
    ];
  }, [folders, files, sort]);

  const setViewMode = (mode: ViewMode): void => {
    setView(mode);
    try {
      window.localStorage.setItem(VIEW_KEY, mode);
    } catch {
      /* preference is optional */
    }
  };

  const openFolder = (f: StorageFolder): void => {
    setSearch('');
    setTrail((t) => [...t, { id: f.id, name: f.name }]);
  };

  const openUrl = useCallback(
    (file: StorageFile, disposition: 'attachment' | 'inline'): void => {
      api
        .getDownloadUrl(file.id, disposition)
        .then((url) => window.open(url, '_blank', 'noopener,noreferrer'))
        .catch((e: Error) => notify?.error(e.message));
    },
    [api, notify],
  );

  const showPreview = (file: StorageFile): void => {
    if (!isPreviewable(kindOf(file.mimeType, file.name))) return openUrl(file, 'inline');
    setPreview({ file });
    api
      .getDownloadUrl(file.id, 'inline')
      .then((url) => setPreview((p) => (p && p.file.id === file.id ? { ...p, url } : p)))
      .catch((e: Error) => setPreview((p) => (p ? { ...p, error: e.message } : p)));
  };

  const open = (entry: Entry): void => (entry.kind === 'folder' ? openFolder(entry.folder) : showPreview(entry.file));

  const confirmDelete = (): void => {
    const entry = toDelete;
    if (!entry) return;
    setDeleting(true);
    (entry.kind === 'file' ? api.deleteFile(entry.id) : api.deleteFolder(entry.id))
      .then(() => {
        notify?.success(entry.kind === 'file' ? 'File deleted' : 'Folder deleted');
        reload();
      })
      .catch((e: Error) => notify?.error(e.message))
      .finally(() => {
        setDeleting(false);
        setToDelete(undefined);
      });
  };

  const createFolder = (): void => {
    const name = folderName.trim();
    if (!name) return;
    setShowNew(false);
    setFolderName('');
    api
      .createFolder(name, current.id)
      .then(() => {
        notify?.success('Folder created');
        reload();
      })
      .catch((e: Error) => notify?.error(e.message));
  };

  const menuFor = (entry: Entry) => [
    ...(entry.kind === 'folder'
      ? [{ key: 'open', label: 'Open', onClick: () => open(entry) }]
      : [
          { key: 'view', label: 'View', onClick: () => showPreview(entry.file) },
          ...(allow.download ? [{ key: 'download', label: 'Download', onClick: () => openUrl(entry.file, 'attachment') }] : []),
        ]),
    ...((entry.kind === 'file' ? allow.deleteFile : allow.deleteFolder)
      ? [{ key: 'delete', label: 'Delete', danger: true, onClick: () => setToDelete(entry) }]
      : []),
  ];

  const meta = (entry: Entry): string =>
    entry.kind === 'folder' ? 'Folder' : [formatBytes(entry.file.size), formatDate(entry.file.createdAt)].filter(Boolean).join(' · ');

  const totalSize = files.reduce((n, f) => n + f.size, 0);
  const uploaderVisible = allow.upload && (showUploader || queue.items.length > 0);

  return (
    <div
      onDragEnter={(e) => allow.upload && e.dataTransfer.types.includes('Files') && setDragging(true)}
      onDragOver={(e) => allow.upload && e.preventDefault()}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        if (!allow.upload) return;
        e.preventDefault();
        setDragging(false);
        const dropped = Array.from(e.dataTransfer.files);
        if (dropped.length > 0) {
          setShowUploader(true);
          queue.add(dropped);
        }
      }}
      style={{ position: 'relative', fontFamily: 'var(--maw-font-family)', color: 'var(--maw-fg)' }}
    >
      {dragging && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px dashed var(--maw-brand)', borderRadius: 'var(--maw-radius-lg)', background: 'var(--maw-infoBg)',
            fontWeight: 600, pointerEvents: 'none',
          }}
        >
          Drop to upload to “{current.name}”
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--maw-space-md)', marginBottom: 'var(--maw-space-md)' }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 'var(--maw-text-lg)' : 'var(--maw-text-xl, 1.5rem)', flex: '1 1 auto' }}>{title}</h1>
        <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', flex: isMobile ? '1 1 100%' : '0 0 auto' }}>
          {allow.createFolder && (
            <Button variant="ghost" onClick={() => setShowNew(true)} style={isMobile ? { flex: 1 } : undefined}>＋ New folder</Button>
          )}
          {allow.upload && (
            <Button onClick={() => setShowUploader((v) => !v)} style={isMobile ? { flex: 1 } : undefined}>
              {queue.busy ? 'Uploading…' : '⬆ Upload'}
            </Button>
          )}
        </div>
      </div>

      <nav aria-label="Folder path" style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4, marginBottom: 'var(--maw-space-sm)' }}>
        {trail.map((crumb, i) => (
          <span key={`${crumb.id ?? 'root'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <span aria-hidden style={{ color: 'var(--maw-fgMuted)' }}>›</span>}
            {i === trail.length - 1 ? (
              <strong aria-current="page">{crumb.name}</strong>
            ) : (
              <Button variant="ghost" onClick={() => setTrail(trail.slice(0, i + 1))}>{crumb.name}</Button>
            )}
          </span>
        ))}
      </nav>

      {uploaderVisible && (
        <UploadPanel queue={queue} accept={accept} maxSizeBytes={maxSizeBytes} style={{ marginBottom: 'var(--maw-space-lg)' }} />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--maw-space-sm)', alignItems: 'center', marginBottom: 'var(--maw-space-md)' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <TextField value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…" aria-label="Search files" />
        </div>
        <select
          aria-label="Sort files"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          style={{ padding: '8px 10px', borderRadius: 'var(--maw-radius-md)', border: '1px solid var(--maw-border)', background: 'var(--maw-surface)', color: 'var(--maw-fg)', minHeight: 40 }}
        >
          <option value="name">Name</option>
          <option value="newest">Newest</option>
          <option value="largest">Largest</option>
        </select>
        <div role="group" aria-label="View" style={{ display: 'inline-flex', gap: 4 }}>
          <IconButton label="List view" aria-pressed={view === 'list'} onClick={() => setViewMode('list')} style={view === 'list' ? { background: 'var(--maw-infoBg)' } : undefined}>☰</IconButton>
          <IconButton label="Grid view" aria-pressed={view === 'grid'} onClick={() => setViewMode('grid')} style={view === 'grid' ? { background: 'var(--maw-infoBg)' } : undefined}>▦</IconButton>
        </div>
      </div>

      {error ? (
        <ErrorState title="Couldn't load files" message={error} retry={reload} />
      ) : loading && entries.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--maw-space-xxl)' }}><Spinner /></div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={query ? '🔍' : '📂'}
          title={query ? 'No matches' : 'This folder is empty'}
          message={query ? `Nothing found for “${query}”.` : allow.upload ? 'Drop files here or tap Upload to add your first file.' : undefined}
          action={!query && allow.upload ? <Button onClick={() => setShowUploader(true)}>Upload files</Button> : undefined}
        />
      ) : (
        <ul
          style={{
            listStyle: 'none', margin: 0, padding: 0, display: 'grid',
            gap: view === 'grid' ? 'var(--maw-space-md)' : 'var(--maw-space-xs)',
            gridTemplateColumns: view === 'grid' ? `repeat(auto-fill, minmax(${isMobile ? 140 : 180}px, 1fr))` : '1fr',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {entries.map((entry) => {
            const kind = entry.kind === 'file' ? kindOf(entry.file.mimeType, entry.file.name) : null;
            const icon = entry.kind === 'folder' ? '📁' : iconOf(kind!);
            const actions = menuFor(entry);
            const menu = actions.length > 0 && (
              <DropdownMenu trigger={<IconButton label={`Actions for ${entry.name}`}>⋯</IconButton>} items={actions} />
            );
            return view === 'grid' ? (
              <li key={`${entry.kind}-${entry.id}`} style={{ ...card, padding: 'var(--maw-space-md)', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 4, right: 4 }}>{menu}</div>
                <button
                  type="button"
                  onClick={() => open(entry)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', minHeight: 44 }}
                  aria-label={`${entry.kind === 'folder' ? 'Open folder' : 'Preview'} ${entry.name}`}
                >
                  <div style={{ fontSize: 44, lineHeight: 1.2 }} aria-hidden>{icon}</div>
                  <div style={{ marginTop: 6, fontWeight: 600, overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.name}</div>
                  <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', marginTop: 2 }}>{meta(entry)}</div>
                </button>
              </li>
            ) : (
              <li key={`${entry.kind}-${entry.id}`} style={{ ...card, display: 'flex', alignItems: 'center', gap: 'var(--maw-space-sm)', padding: '6px var(--maw-space-sm) 6px var(--maw-space-md)' }}>
                <button
                  type="button"
                  onClick={() => open(entry)}
                  style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--maw-space-md)', flex: 1, minWidth: 0, minHeight: 48 }}
                  aria-label={`${entry.kind === 'folder' ? 'Open folder' : 'Preview'} ${entry.name}`}
                >
                  <span style={{ fontSize: 26 }} aria-hidden>{icon}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{entry.name}</span>
                    {isMobile && <span style={{ display: 'block', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{meta(entry)}</span>}
                  </span>
                  {!isMobile && (
                    <>
                      <span style={{ width: 90, textAlign: 'right', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>{entry.kind === 'file' ? formatBytes(entry.file.size) : ''}</span>
                      <span style={{ width: 120, textAlign: 'right', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>{entry.kind === 'file' ? formatDate(entry.file.createdAt) : ''}</span>
                    </>
                  )}
                </button>
                {!isMobile && entry.kind === 'file' && allow.download && (
                  <IconButton label={`Download ${entry.name}`} onClick={() => openUrl(entry.file, 'attachment')}>⬇</IconButton>
                )}
                {menu}
              </li>
            );
          })}
        </ul>
      )}

      {!error && entries.length > 0 && (
        <div style={{ marginTop: 'var(--maw-space-md)', fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
          {folders.length} folder{folders.length === 1 ? '' : 's'} · {files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
          {files.length >= 100 && ' · showing the first 100 — use search to narrow down'}
        </div>
      )}

      <Modal
        open={preview !== undefined}
        onClose={() => setPreview(undefined)}
        title={preview?.file.name}
        width={900}
        footer={
          <>
            {preview && allow.download && <Button variant="ghost" onClick={() => openUrl(preview.file, 'attachment')}>Download</Button>}
            <Button onClick={() => setPreview(undefined)}>Close</Button>
          </>
        }
      >
        <PreviewBody preview={preview} />
      </Modal>

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={folderName.trim().length === 0} onClick={createFolder}>Create</Button>
          </>
        }
      >
        <FormField label="Folder name" required>
          <TextField
            value={folderName}
            autoFocus
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            placeholder="e.g. Contracts"
          />
        </FormField>
      </Modal>

      <ConfirmationDialog
        open={toDelete !== undefined}
        variant="danger"
        title={toDelete?.kind === 'folder' ? 'Delete folder' : 'Delete file'}
        message={`Delete “${toDelete?.name ?? ''}”? ${toDelete?.kind === 'folder' ? 'Only empty folders can be deleted.' : 'This cannot be undone.'}`}
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setToDelete(undefined)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function PreviewBody({ preview }: { preview?: PreviewState }): ReactNode {
  if (!preview) return null;
  if (preview.error) return <ErrorState title="Couldn't open file" message={preview.error} />;
  if (!preview.url) return <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--maw-space-xl)' }}><Spinner /></div>;
  const kind = kindOf(preview.file.mimeType, preview.file.name);
  const box: CSSProperties = { width: '100%', maxHeight: '70vh', borderRadius: 'var(--maw-radius-md)', display: 'block' };
  if (kind === 'image') return <img src={preview.url} alt={preview.file.name} style={{ ...box, objectFit: 'contain' }} />;
  if (kind === 'pdf') return <iframe src={preview.url} title={preview.file.name} style={{ ...box, height: '70vh', border: '1px solid var(--maw-border)' }} />;
  if (kind === 'video') return <video src={preview.url} controls style={box} />;
  if (kind === 'audio') return <audio src={preview.url} controls style={{ width: '100%' }} />;
  return null;
}
