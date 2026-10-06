import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmationDialog,
  DataTable,
  ErrorState,
  FormField,
  ListPage,
  Modal,
  PageLoader,
  Select,
  TextField,
  useToast,
  type ColumnDef,
} from '@mawsoftwares/ui-web';
import {
  createConfiguration,
  deleteConfiguration,
  listConfigurations,
  testConfiguration,
  updateConfiguration,
  type ConfigurationInput,
  type StorageConfiguration,
} from './storage-api';

interface FormState {
  provider: 'local' | 's3';
  name: string;
  bucket: string;
  region: string;
  endpoint: string;
  basePath: string;
  accessKeyId: string;
  secretAccessKey: string;
  isDefault: boolean;
  isActive: boolean;
}

const EMPTY: FormState = {
  provider: 's3',
  name: '',
  bucket: '',
  region: '',
  endpoint: '',
  basePath: '',
  accessKeyId: '',
  secretAccessKey: '',
  isDefault: false,
  isActive: true,
};

function toForm(c: StorageConfiguration): FormState {
  return {
    provider: c.provider,
    name: c.name,
    bucket: c.bucket ?? '',
    region: c.region ?? '',
    endpoint: c.endpoint ?? '',
    basePath: c.basePath,
    accessKeyId: '',
    secretAccessKey: '',
    isDefault: c.isDefault,
    isActive: c.isActive,
  };
}

function validate(f: FormState, editing: boolean): string | undefined {
  if (!f.name.trim()) return 'Name is required';
  if (f.provider === 's3') {
    if (!f.bucket.trim()) return 'Bucket is required';
    if (!f.region.trim()) return 'Region is required';
  }
  if (Boolean(f.accessKeyId.trim()) !== Boolean(f.secretAccessKey.trim())) {
    return editing
      ? 'Enter both access key and secret to replace credentials, or leave both blank to keep them'
      : 'Enter both access key and secret, or leave both blank to use the server credentials';
  }
  return undefined;
}

function toInput(f: FormState, editing: boolean): ConfigurationInput {
  const s3 = f.provider === 's3';
  const credentials = f.accessKeyId.trim()
    ? { accessKeyId: f.accessKeyId.trim(), secretAccessKey: f.secretAccessKey.trim() }
    : undefined;
  return {
    ...(editing ? {} : { provider: f.provider }),
    name: f.name.trim(),
    basePath: f.basePath.trim() || null,
    ...(s3 ? { bucket: f.bucket.trim(), region: f.region.trim(), endpoint: f.endpoint.trim() || null } : {}),
    ...(s3 && credentials ? { credentials } : {}),
    isDefault: f.isDefault,
    ...(editing ? { isActive: f.isActive } : {}),
  };
}

export function StorageSettingsView(): ReactNode {
  const toast = useToast();
  const [configs, setConfigs] = useState<StorageConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<StorageConfiguration | 'new'>();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState<string>();
  const [toDelete, setToDelete] = useState<StorageConfiguration>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    listConfigurations()
      .then(setConfigs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string): Promise<boolean> => {
      setBusy(true);
      try {
        await action();
        if (success) toast.success(success);
        load();
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load, toast],
  );

  const openForm = (target: StorageConfiguration | 'new'): void => {
    setEditing(target);
    setForm(target === 'new' ? EMPTY : toForm(target));
    setFormError(undefined);
  };

  const save = async (): Promise<void> => {
    const isEdit = editing !== 'new' && editing !== undefined;
    const problem = validate(form, isEdit);
    if (problem) return setFormError(problem);
    const input = toInput(form, isEdit);
    const ok = await run(
      () => (isEdit ? updateConfiguration(editing.id, input) : createConfiguration(input)),
      isEdit ? 'Configuration updated' : 'Configuration created',
    );
    if (ok) setEditing(undefined);
  };

  const test = (c: StorageConfiguration): void => {
    void run(async () => {
      const r = await testConfiguration(c.id);
      if (r.ok) toast.success(`${c.name}: ${r.message}`);
      else toast.error(`${c.name}: ${r.message}`);
    });
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void => setForm((f) => ({ ...f, [key]: value }));

  const columns: ColumnDef<StorageConfiguration>[] = [
    { key: 'name', header: 'Name' },
    { key: 'provider', header: 'Provider', width: 110, render: (c) => <Badge variant="info">{c.provider === 's3' ? 'S3' : 'Local disk'}</Badge> },
    {
      key: 'bucket',
      header: 'Bucket / Region',
      render: (c) => (c.provider === 's3' ? `${c.bucket ?? ''} · ${c.region ?? ''}${c.endpoint ? ` · ${c.endpoint}` : ''}` : '—'),
    },
    { key: 'basePath', header: 'Base path', render: (c) => c.basePath || '—' },
    { key: 'hasCredentials', header: 'Credentials', width: 120, render: (c) => (c.provider === 's3' ? (c.hasCredentials ? 'Stored (hidden)' : 'Server default') : '—') },
    {
      key: 'isDefault',
      header: 'Status',
      width: 150,
      render: (c) => (
        <>
          {c.isDefault && <Badge variant="success">Default</Badge>} {!c.isActive && <Badge variant="warning">Inactive</Badge>}
        </>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 340,
      render: (c) => (
        <>
          <Button variant="ghost" onClick={() => test(c)} disabled={busy}>Test</Button>
          <Button variant="ghost" onClick={() => openForm(c)}>Edit</Button>
          {!c.isDefault && c.isActive && (
            <Button variant="ghost" onClick={() => void run(() => updateConfiguration(c.id, { isDefault: true }), 'Default storage changed')}>Make default</Button>
          )}
          {!c.isDefault && (
            <Button variant="ghost" style={{ color: 'var(--maw-danger)' }} onClick={() => setToDelete(c)}>Delete</Button>
          )}
        </>
      ),
    },
  ];

  if (error) return <ErrorState title="Failed to load storage settings" message={error} retry={load} />;
  if (loading && configs.length === 0) return <PageLoader message="Loading storage settings..." />;

  const isEdit = editing !== undefined && editing !== 'new';

  return (
    <>
      <ListPage
        title="Storage Settings"
        description="Where this tenant's files are stored. New uploads use the default configuration."
        createLabel="Add storage"
        onCreate={() => openForm('new')}
      >
        <DataTable columns={columns} data={configs} keyField="id" loading={loading} emptyMessage="No storage configured yet — add one to enable uploads" />
      </ListPage>

      <Modal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        title={isEdit ? 'Edit storage' : 'Add storage'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(undefined)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        {formError && <div role="alert" style={{ color: 'var(--maw-danger)', marginBottom: 'var(--maw-space-md)' }}>{formError}</div>}
        <Select
          label="Provider"
          value={form.provider}
          disabled={isEdit}
          onChange={(e) => set('provider', e.target.value as FormState['provider'])}
          options={[{ value: 's3', label: 'Amazon S3 / S3-compatible' }, { value: 'local', label: 'Local disk (server)' }]}
        />
        <FormField label="Name" required>
          <TextField value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Production S3" />
        </FormField>
        {form.provider === 's3' && (
          <>
            <FormField label="Bucket" required>
              <TextField value={form.bucket} onChange={(e) => set('bucket', e.target.value)} placeholder="client-files" />
            </FormField>
            <FormField label="Region" required>
              <TextField value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="ap-south-1" />
            </FormField>
            <FormField label="Endpoint (only for MinIO / R2 / other S3-compatible)">
              <TextField value={form.endpoint} onChange={(e) => set('endpoint', e.target.value)} placeholder="https://..." />
            </FormField>
            <FormField label={isEdit ? 'Access key ID (leave blank to keep current)' : 'Access key ID (blank = server credentials)'}>
              <TextField value={form.accessKeyId} onChange={(e) => set('accessKeyId', e.target.value)} autoComplete="off" />
            </FormField>
            <FormField label={isEdit ? 'Secret access key (leave blank to keep current)' : 'Secret access key'}>
              <TextField type="password" value={form.secretAccessKey} onChange={(e) => set('secretAccessKey', e.target.value)} autoComplete="new-password" />
            </FormField>
          </>
        )}
        <FormField label="Base path (optional folder prefix inside the bucket / storage root)">
          <TextField value={form.basePath} onChange={(e) => set('basePath', e.target.value)} placeholder="maw/prod" />
        </FormField>
        <Checkbox label="Use as default storage" checked={form.isDefault} onChange={(v) => set('isDefault', v)} />
        {isEdit && <Checkbox label="Active" checked={form.isActive} onChange={(v) => set('isActive', v)} />}
      </Modal>

      <ConfirmationDialog
        open={toDelete !== undefined}
        variant="danger"
        title="Delete storage configuration"
        message={`Delete "${toDelete?.name ?? ''}"? Configurations that already hold folders or files cannot be deleted — deactivate them instead.`}
        confirmLabel="Delete"
        loading={busy}
        onCancel={() => setToDelete(undefined)}
        onConfirm={() => {
          const target = toDelete;
          setToDelete(undefined);
          if (target) void run(() => deleteConfiguration(target.id), 'Configuration deleted');
        }}
      />
    </>
  );
}
