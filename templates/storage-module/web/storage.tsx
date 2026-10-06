import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Badge,
  Button,
  DataTable,
  ConfirmationDialog,
  ErrorState,
  FormField,
  ListPage,
  Modal,
  PageLoader,
  TextField,
  useDynamicAccess,
  useToast,
  type ColumnDef,
} from '@mawsoftwares/ui-web';
import {
  createFolder,
  deleteFile,
  deleteFolder,
  getDownloadUrl,
  listFiles,
  listFolders,
  uploadFile,
  type StorageFile,
  type StorageFolder,
} from './storage-api';

interface Row {
  id: string;
  kind: 'folder' | 'file';
  name: string;
  detail: string;
  folder?: StorageFolder;
  file?: StorageFile;
}

interface Crumb {
  id: string | null;
  name: string;
}

const ROOT: Crumb = { id: null, name: 'All files' };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageView(): ReactNode {
  const toast = useToast();
  const { can } = useDynamicAccess();
  const input = useRef<HTMLInputElement>(null);
  const [trail, setTrail] = useState<Crumb[]>([ROOT]);
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [toDelete, setToDelete] = useState<Row>();

  const current = trail[trail.length - 1]!;

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([listFolders(current.id), listFiles(current.id, search || undefined)])
      .then(([f, fl]) => {
        setFolders(f);
        setFiles(fl);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [current.id, search]);

  useEffect(load, [load]);

  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string) => {
      setBusy(true);
      try {
        await action();
        if (success) toast.success(success);
        load();
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [load, toast],
  );

  const onPick = (e: ChangeEvent<HTMLInputElement>): void => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;
    void run(async () => {
      for (const f of picked) await uploadFile(f, current.id);
    }, `${picked.length} file(s) uploaded`);
  };

  const open = (url: string): void => {
    window.open(url, '_blank', 'noopener');
  };

  const rows: Row[] = [
    ...folders.map((f): Row => ({ id: `d-${f.id}`, kind: 'folder', name: f.name, detail: 'Folder', folder: f })),
    ...files.map((f): Row => ({ id: `f-${f.id}`, kind: 'file', name: f.name, detail: `${formatSize(f.size)} · ${f.mimeType}`, file: f })),
  ];

  const columns: ColumnDef<Row>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (r) =>
        r.folder ? (
          <Button variant="ghost" onClick={() => setTrail([...trail, { id: r.folder!.id, name: r.folder!.name }])}>
            📁 {r.name}
          </Button>
        ) : (
          <span>📄 {r.name}</span>
        ),
    },
    { key: 'detail', header: 'Details', render: (r) => <Badge variant={r.kind === 'folder' ? 'info' : 'success'}>{r.detail}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      width: 300,
      render: (r) => (
        <>
          {r.file && can('Download_Storage') && (
            <>
              <Button variant="ghost" onClick={() => void run(async () => open(await getDownloadUrl(r.file!.id, 'inline')))}>View</Button>
              <Button variant="ghost" onClick={() => void run(async () => open(await getDownloadUrl(r.file!.id, 'attachment')))}>Download</Button>
            </>
          )}
          {((r.file && can('Delete_StorageFiles')) || (r.folder && can('Delete_StorageFolders'))) && (
            <Button variant="ghost" style={{ color: 'var(--maw-danger)' }} onClick={() => setToDelete(r)}>Delete</Button>
          )}
        </>
      ),
    },
  ];

  if (error) return <ErrorState title="Failed to load files" message={error} retry={load} />;
  if (loading && rows.length === 0 && trail.length === 1 && !search) return <PageLoader message="Loading files..." />;

  return (
    <>
      <ListPage
        title="Files"
        description={trail.map((c) => c.name).join(' / ')}
        createLabel="New Folder"
        onCreate={can('Create_StorageFolders') ? () => setShowNew(true) : undefined}
        filter={search}
        onFilterChange={setSearch}
        toolbar={
          <>
            {trail.length > 1 && <Button variant="ghost" onClick={() => setTrail(trail.slice(0, -1))}>← Back</Button>}
            {can('Upload_Storage') && (
              <>
                <Button onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Working...' : 'Upload'}</Button>
                <input ref={input} type="file" multiple hidden onChange={onPick} />
              </>
            )}
          </>
        }
      >
        <DataTable columns={columns} data={rows} keyField="id" loading={loading} emptyMessage="This folder is empty" stickyHeader />
      </ListPage>

      <ConfirmationDialog
        open={toDelete !== undefined}
        variant="danger"
        title={toDelete?.kind === 'folder' ? 'Delete folder' : 'Delete file'}
        message={`Delete "${toDelete?.name ?? ''}"? ${toDelete?.kind === 'folder' ? 'Only empty folders can be deleted.' : 'This cannot be undone.'}`}
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setToDelete(undefined)}
        onConfirm={() => {
          const row = toDelete;
          setToDelete(undefined);
          if (!row) return;
          void run(
            () => (row.file ? deleteFile(row.file.id) : deleteFolder(row.folder!.id)),
            row.file ? 'File deleted' : 'Folder deleted',
          );
        }}
      />

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New Folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              disabled={busy || folderName.trim().length === 0}
              onClick={() => {
                const name = folderName.trim();
                setShowNew(false);
                setFolderName('');
                void run(() => createFolder(name, current.id), 'Folder created');
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <FormField label="Folder name" required>
          <TextField value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="e.g. Contracts" />
        </FormField>
      </Modal>
    </>
  );
}
