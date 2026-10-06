import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  listProviders,
  testConfiguration,
  updateConfiguration,
  type ConfigFieldName,
  type ConfigurationInput,
  type ProviderInfo,
  type StorageConfiguration,
} from './storage-config-api';

interface FormState {
  provider: string;
  name: string;
  values: Partial<Record<ConfigFieldName, string>>;
  accessKeyId: string;
  secretAccessKey: string;
  isDefault: boolean;
  isActive: boolean;
}

const emptyForm = (provider: string): FormState => ({
  provider,
  name: '',
  values: {},
  accessKeyId: '',
  secretAccessKey: '',
  isDefault: false,
  isActive: true,
});

function storedValue(c: StorageConfiguration, field: ConfigFieldName): string {
  switch (field) {
    case 'bucket': return c.bucket ?? '';
    case 'region': return c.region ?? '';
    case 'endpoint': return c.endpoint ?? '';
    case 'basePath': return c.basePath;
    default: return '';
  }
}

/** Builds the edit form from a stored config, using each field's `prefillFromEndpoint` hint (e.g. R2 account id). */
function toForm(c: StorageConfiguration, info: ProviderInfo | undefined): FormState {
  const values: Partial<Record<ConfigFieldName, string>> = {};
  for (const f of info?.fields ?? []) {
    let v = storedValue(c, f.name);
    if (f.prefillFromEndpoint && c.endpoint) v = new RegExp(f.prefillFromEndpoint).exec(c.endpoint)?.[1] ?? '';
    // A derived endpoint is not something the admin typed; only show it when it differs from the derived default.
    if (f.name === 'endpoint' && info?.fields.some((x) => x.prefillFromEndpoint) && /^https:\/\/[^./]+\.r2\./.test(v)) v = '';
    values[f.name] = v;
  }
  return { provider: c.provider, name: c.name, values, accessKeyId: '', secretAccessKey: '', isDefault: c.isDefault, isActive: c.isActive };
}

function validate(f: FormState, info: ProviderInfo, editing: boolean): string | undefined {
  if (!f.name.trim()) return 'Name is required';
  for (const field of info.fields) {
    const skip = editing && field.name === 'accountId'; // an unchanged account id is kept
    if (field.required && !skip && !(f.values[field.name] ?? '').trim()) return `${field.label} is required`;
  }
  const hasKey = f.accessKeyId.trim().length > 0;
  const hasSecret = f.secretAccessKey.trim().length > 0;
  if (hasKey !== hasSecret) return `Enter both ${info.credentials?.accessKeyLabel ?? 'access key'} and ${info.credentials?.secretLabel ?? 'secret'}, or leave both blank`;
  if (!editing && info.credentials?.required && !hasKey) return `${info.credentials.accessKeyLabel} and ${info.credentials.secretLabel} are required`;
  return undefined;
}

function toInput(f: FormState, info: ProviderInfo, editing: boolean): ConfigurationInput {
  const input: Record<string, unknown> = {
    ...(editing ? {} : { provider: f.provider }),
    name: f.name.trim(),
    isDefault: f.isDefault,
    ...(editing ? { isActive: f.isActive } : {}),
  };
  for (const field of info.fields) {
    const v = (f.values[field.name] ?? '').trim();
    if (editing && field.name === 'accountId' && !v) continue;
    input[field.name] = v || null;
  }
  if (info.credentials && f.accessKeyId.trim()) {
    input['credentials'] = { accessKeyId: f.accessKeyId.trim(), secretAccessKey: f.secretAccessKey.trim() };
  }
  return input as unknown as ConfigurationInput;
}

export function StorageSettingsView(): ReactNode {
  const toast = useToast();
  const [configs, setConfigs] = useState<StorageConfiguration[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<StorageConfiguration | 'new'>();
  const [form, setForm] = useState<FormState>(emptyForm('s3'));
  const [formError, setFormError] = useState<string>();
  const [toDelete, setToDelete] = useState<StorageConfiguration>();

  const infoOf = useCallback((type: string) => providers.find((p) => p.type === type), [providers]);
  const labelOf = (type: string): string => infoOf(type)?.label ?? type;

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([listConfigurations(), listProviders()])
      .then(([c, p]) => {
        setConfigs(c);
        setProviders(p);
      })
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
    setForm(target === 'new' ? emptyForm(providers.find((p) => p.type === 's3')?.type ?? providers[0]?.type ?? 's3') : toForm(target, infoOf(target.provider)));
    setFormError(undefined);
  };

  const info = infoOf(form.provider);
  const isEdit = editing !== undefined && editing !== 'new';

  const save = async (): Promise<void> => {
    if (!info) return;
    const problem = validate(form, info, isEdit);
    if (problem) return setFormError(problem);
    const input = toInput(form, info, isEdit);
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

  const columns = useMemo<ColumnDef<StorageConfiguration>[]>(
    () => [
      { key: 'name', header: 'Name' },
      { key: 'provider', header: 'Provider', width: 190, render: (c) => <Badge variant="info">{labelOf(c.provider)}</Badge> },
      {
        key: 'bucket',
        header: 'Bucket / Container',
        render: (c) => (c.bucket ? `${c.bucket}${c.region && c.region !== 'auto' ? ` · ${c.region}` : ''}` : '—'),
      },
      { key: 'basePath', header: 'Base path', render: (c) => c.basePath || '—' },
      {
        key: 'hasCredentials',
        header: 'Credentials',
        width: 130,
        render: (c) => (c.hasCredentials ? 'Stored (hidden)' : infoOf(c.provider)?.credentials ? 'Server default' : '—'),
      },
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
    ],
    [providers, busy],
  );

  if (error) return <ErrorState title="Failed to load storage settings" message={error} retry={load} />;
  if (loading && configs.length === 0 && providers.length === 0) return <PageLoader message="Loading storage settings..." />;

  const setField = (name: ConfigFieldName, value: string): void => setForm((f) => ({ ...f, values: { ...f.values, [name]: value } }));

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
            <Button onClick={() => void save()} disabled={busy || !info}>{busy ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        {formError && <div role="alert" style={{ color: 'var(--maw-danger)', marginBottom: 'var(--maw-space-md)' }}>{formError}</div>}
        <Select
          label="Provider"
          value={form.provider}
          disabled={isEdit}
          onChange={(e) => setForm({ ...emptyForm(e.target.value), name: form.name, isDefault: form.isDefault })}
          options={providers.map((p) => ({ value: p.type, label: p.label }))}
        />
        {info && <p style={{ margin: '0 0 var(--maw-space-md)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>{info.description}</p>}
        <FormField label="Name" required>
          <TextField value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Production storage" />
        </FormField>
        {info?.fields.map((field) => (
          <FormField key={field.name} label={field.label} required={field.required && !(isEdit && field.name === 'accountId')}>
            <TextField
              value={form.values[field.name] ?? ''}
              onChange={(e) => setField(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
            {field.help && <small style={{ color: 'var(--maw-fgMuted)' }}>{field.help}</small>}
          </FormField>
        ))}
        {info?.credentials && (
          <>
            <FormField label={isEdit ? `${info.credentials.accessKeyLabel} (leave blank to keep current)` : info.credentials.accessKeyLabel} required={info.credentials.required && !isEdit}>
              <TextField value={form.accessKeyId} onChange={(e) => setForm({ ...form, accessKeyId: e.target.value })} autoComplete="off" />
            </FormField>
            <FormField label={isEdit ? `${info.credentials.secretLabel} (leave blank to keep current)` : info.credentials.secretLabel} required={info.credentials.required && !isEdit}>
              <TextField type="password" value={form.secretAccessKey} onChange={(e) => setForm({ ...form, secretAccessKey: e.target.value })} autoComplete="new-password" />
              {info.credentials.help && <small style={{ color: 'var(--maw-fgMuted)' }}>{info.credentials.help}</small>}
            </FormField>
          </>
        )}
        <Checkbox label="Use as default storage" checked={form.isDefault} onChange={(v) => setForm({ ...form, isDefault: v })} />
        {isEdit && <Checkbox label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />}
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
