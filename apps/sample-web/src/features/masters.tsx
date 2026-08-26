import { useState, useCallback, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import type { ApiSuccessResponse } from '@maw/api/response/types';
import type {
  Master, MasterField, MasterValue,
} from '@maw/masters';
import {
  ListPage, DataTable, Badge, Button, Modal, TextField, useForm, FormField,
  useToast, ErrorState, PageLoader, Tabs, type ColumnDef, type SortState,
} from '@maw/ui-web';
import { client } from '../api';

// ---------------------------------------------------------------------------
// Master List
// ---------------------------------------------------------------------------

const MASTER_COLUMNS: ColumnDef<Master>[] = [
  { key: 'code', header: 'Code', sortable: true, width: 160 },
  { key: 'name', header: 'Name', sortable: true },
  {
    key: 'status',
    header: 'Status',
    width: 100,
    render: (row) => <Badge variant={row.status === 'active' ? 'success' : 'warning'}>{row.status}</Badge>,
  },
  {
    key: 'isSystem',
    header: 'System',
    width: 80,
    render: (row) => row.isSystem ? <Badge variant="info">Yes</Badge> : null,
  },
];

function MasterList({ onSelect }: { onSelect: (m: Master) => void }): ReactNode {
  const toast = useToast();
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [sort, setSort] = useState<SortState>();
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client
      .request<ApiSuccessResponse<Master[]>>('/api/v1/masters')
      .then((r) => { setMasters(r.data); setLoaded(true); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  const createForm = useForm({
    initialValues: { code: '', name: '', description: '' },
    fields: {
      code: { required: true, validate: (v) => /^[A-Z][A-Z0-9_]{1,62}[A-Z0-9]$/.test(String(v)) ? undefined : 'UPPER_SNAKE_CASE, 3-64 chars' },
      name: { required: true },
    },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/masters', {
          method: 'POST',
          body: JSON.stringify({
            code: values.code,
            name: values.name,
            description: values.description || undefined,
          }),
        });
        toast.success('Master created');
        setShowCreate(false);
        createForm.reset();
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  if (!loaded && !loading && !error) {
    return (
      <ListPage title="Master Data" createLabel="New Master" onCreate={() => setShowCreate(true)}>
        <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)' }}>
          <Button onClick={load}>Load Masters from API</Button>
        </div>
        <CreateMasterModal open={showCreate} onClose={() => setShowCreate(false)} form={createForm} />
      </ListPage>
    );
  }

  if (error) return <ErrorState title="Failed to load masters" message={error} retry={load} />;
  if (loading && !loaded) return <PageLoader message="Loading masters..." />;

  const filtered = filter
    ? masters.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()) || m.code.toLowerCase().includes(filter.toLowerCase()))
    : masters;

  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const av = String(a[sort.column as keyof Master] ?? '');
        const bv = String(b[sort.column as keyof Master] ?? '');
        return sort.direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filtered;

  return (
    <>
      <ListPage
        title="Master Data"
        description={`${masters.length} masters defined`}
        createLabel="New Master"
        onCreate={() => setShowCreate(true)}
        filter={filter}
        onFilterChange={setFilter}
      >
        <DataTable
          columns={[
            ...MASTER_COLUMNS,
            {
              key: 'actions' as keyof Master,
              header: '',
              width: 80,
              render: (row) => (
                <Button variant="ghost" onClick={() => onSelect(row)} style={{ fontSize: 'var(--maw-text-xs)' }}>
                  Manage
                </Button>
              ),
            },
          ]}
          data={sorted}
          keyField="id"
          sort={sort}
          onSort={setSort}
          loading={loading}
          emptyMessage="No masters found"
          stickyHeader
        />
      </ListPage>
      <CreateMasterModal open={showCreate} onClose={() => setShowCreate(false)} form={createForm} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Create Master Modal
// ---------------------------------------------------------------------------

function CreateMasterModal({ open, onClose, form }: {
  open: boolean;
  onClose: () => void;
  form: ReturnType<typeof useForm<{ code: string; name: string; description: string }>>;
}): ReactNode {
  return (
    <Modal open={open} onClose={onClose} title="Create Master" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => form.handleSubmit()} disabled={form.submitting}>
          {form.submitting ? 'Creating...' : 'Create'}
        </Button>
      </>
    }>
      <FormField label="Code" error={form.getFieldProps('code').error} required>
        <TextField
          value={form.values.code}
          onChange={form.getFieldProps('code').onChange}
          onBlur={form.getFieldProps('code').onBlur}
          placeholder="e.g. PAYMENT_METHOD"
        />
      </FormField>
      <FormField label="Name" error={form.getFieldProps('name').error} required>
        <TextField
          value={form.values.name}
          onChange={form.getFieldProps('name').onChange}
          onBlur={form.getFieldProps('name').onBlur}
          placeholder="e.g. Payment Method"
        />
      </FormField>
      <FormField label="Description">
        <TextField
          value={form.values.description}
          onChange={form.getFieldProps('description').onChange}
          placeholder="Optional description"
        />
      </FormField>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Master Detail — Fields + Values tabs
// ---------------------------------------------------------------------------

const FIELD_COLUMNS: ColumnDef<MasterField>[] = [
  { key: 'code', header: 'Code', width: 160 },
  { key: 'name', header: 'Name' },
  {
    key: 'dataType',
    header: 'Type',
    width: 100,
    render: (row) => <Badge>{row.dataType}</Badge>,
  },
  {
    key: 'isRequired',
    header: 'Required',
    width: 80,
    render: (row) => row.isRequired ? <Badge variant="warning">Yes</Badge> : null,
  },
  { key: 'displayOrder', header: 'Order', width: 70, align: 'right' as const },
];

const VALUE_COLUMNS: ColumnDef<MasterValue>[] = [
  { key: 'code', header: 'Code', width: 120 },
  { key: 'label', header: 'Label' },
  { key: 'value', header: 'Value', width: 140 },
  { key: 'sortOrder', header: 'Order', width: 70, align: 'right' as const },
  {
    key: 'isActive',
    header: 'Active',
    width: 80,
    render: (row) => <Badge variant={row.isActive ? 'success' : 'warning'}>{row.isActive ? 'Yes' : 'No'}</Badge>,
  },
];

function MasterDetail({ master, onBack }: { master: Master; onBack: () => void }): ReactNode {
  const toast = useToast();
  const [tab, setTab] = useState('values');

  // Fields state
  const [fields, setFields] = useState<MasterField[]>([]);
  const [fieldsLoaded, setFieldsLoaded] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [showCreateField, setShowCreateField] = useState(false);

  // Values state
  const [values, setValues] = useState<MasterValue[]>([]);
  const [valuesLoaded, setValuesLoaded] = useState(false);
  const [valuesLoading, setValuesLoading] = useState(false);
  const [showCreateValue, setShowCreateValue] = useState(false);

  const loadFields = useCallback(() => {
    setFieldsLoading(true);
    client
      .request<ApiSuccessResponse<MasterField[]>>(`/api/v1/masters/${master.id}/fields`)
      .then((r) => { setFields(r.data); setFieldsLoaded(true); })
      .catch((e: ApiError) => toast.error(`Failed to load fields: ${e.message}`))
      .finally(() => setFieldsLoading(false));
  }, [master.id, toast]);

  const loadValues = useCallback(() => {
    setValuesLoading(true);
    client
      .request<ApiSuccessResponse<MasterValue[]>>(`/api/v1/masters/${master.id}/values`)
      .then((r) => { setValues(r.data); setValuesLoaded(true); })
      .catch((e: ApiError) => toast.error(`Failed to load values: ${e.message}`))
      .finally(() => setValuesLoading(false));
  }, [master.id, toast]);

  const createFieldForm = useForm({
    initialValues: { code: '', name: '', dataType: 'string' },
    fields: {
      code: { required: true, validate: (v) => /^[a-z][a-z0-9_]*$/.test(String(v)) ? undefined : 'lower_snake_case required' },
      name: { required: true },
    },
    onSubmit: async (vals) => {
      try {
        await client.request(`/api/v1/masters/${master.id}/fields`, {
          method: 'POST',
          body: JSON.stringify({ code: vals.code, name: vals.name, dataType: vals.dataType }),
        });
        toast.success('Field created');
        setShowCreateField(false);
        createFieldForm.reset();
        loadFields();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const createValueForm = useForm({
    initialValues: { code: '', label: '', value: '' },
    fields: {
      code: { required: true },
      label: { required: true },
    },
    onSubmit: async (vals) => {
      try {
        await client.request(`/api/v1/masters/${master.id}/values`, {
          method: 'POST',
          body: JSON.stringify({ code: vals.code, label: vals.label, value: vals.value || undefined }),
        });
        toast.success('Value created');
        setShowCreateValue(false);
        createValueForm.reset();
        loadValues();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const deleteField = useCallback((fieldId: string) => {
    client
      .request(`/api/v1/masters/${master.id}/fields/${fieldId}`, { method: 'DELETE' })
      .then(() => { toast.success('Field deleted'); loadFields(); })
      .catch((e: ApiError) => toast.error(`Delete failed: ${e.message}`));
  }, [master.id, toast, loadFields]);

  const deleteValue = useCallback((valueId: string) => {
    client
      .request(`/api/v1/masters/${master.id}/values/${valueId}`, { method: 'DELETE' })
      .then(() => { toast.success('Value deleted'); loadValues(); })
      .catch((e: ApiError) => toast.error(`Delete failed: ${e.message}`));
  }, [master.id, toast, loadValues]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-md)', marginBottom: 'var(--maw-space-lg)' }}>
        <Button variant="ghost" onClick={onBack}>&larr; Back</Button>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>
            {master.name}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
            {master.code} &middot; <Badge variant={master.status === 'active' ? 'success' : 'warning'}>{master.status}</Badge>
            {master.isSystem && <> &middot; <Badge variant="info">System</Badge></>}
            {master.description && <> &middot; {master.description}</>}
          </p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'values', label: 'Values' },
          { key: 'fields', label: 'Fields' },
        ]}
        activeTab={tab}
        onChange={setTab}
        style={{ marginBottom: 'var(--maw-space-lg)' }}
      />

      {tab === 'values' && (
        <ValuesTab
          values={values}
          loaded={valuesLoaded}
          loading={valuesLoading}
          onLoad={loadValues}
          onCreate={() => setShowCreateValue(true)}
          onDelete={deleteValue}
        />
      )}

      {tab === 'fields' && (
        <FieldsTab
          fields={fields}
          loaded={fieldsLoaded}
          loading={fieldsLoading}
          onLoad={loadFields}
          onCreate={() => setShowCreateField(true)}
          onDelete={deleteField}
        />
      )}

      {/* Create Field Modal */}
      <Modal open={showCreateField} onClose={() => setShowCreateField(false)} title="Add Field" footer={
        <>
          <Button variant="ghost" onClick={() => setShowCreateField(false)}>Cancel</Button>
          <Button onClick={() => createFieldForm.handleSubmit()} disabled={createFieldForm.submitting}>
            {createFieldForm.submitting ? 'Creating...' : 'Create'}
          </Button>
        </>
      }>
        <FormField label="Code" error={createFieldForm.getFieldProps('code').error} required>
          <TextField
            value={createFieldForm.values.code}
            onChange={createFieldForm.getFieldProps('code').onChange}
            onBlur={createFieldForm.getFieldProps('code').onBlur}
            placeholder="e.g. hex_code"
          />
        </FormField>
        <FormField label="Name" error={createFieldForm.getFieldProps('name').error} required>
          <TextField
            value={createFieldForm.values.name}
            onChange={createFieldForm.getFieldProps('name').onChange}
            onBlur={createFieldForm.getFieldProps('name').onBlur}
            placeholder="e.g. Hex Code"
          />
        </FormField>
        <FormField label="Data Type">
          <select
            value={createFieldForm.values.dataType}
            onChange={(e) => createFieldForm.getFieldProps('dataType').onChange(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px',
              borderRadius: 'var(--maw-radius-sm)', border: '1px solid var(--maw-border)',
              background: 'var(--maw-bg)', color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)',
            }}
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="datetime">DateTime</option>
            <option value="json">JSON</option>
            <option value="reference">Reference</option>
          </select>
        </FormField>
      </Modal>

      {/* Create Value Modal */}
      <Modal open={showCreateValue} onClose={() => setShowCreateValue(false)} title="Add Value" footer={
        <>
          <Button variant="ghost" onClick={() => setShowCreateValue(false)}>Cancel</Button>
          <Button onClick={() => createValueForm.handleSubmit()} disabled={createValueForm.submitting}>
            {createValueForm.submitting ? 'Creating...' : 'Create'}
          </Button>
        </>
      }>
        <FormField label="Code" error={createValueForm.getFieldProps('code').error} required>
          <TextField
            value={createValueForm.values.code}
            onChange={createValueForm.getFieldProps('code').onChange}
            onBlur={createValueForm.getFieldProps('code').onBlur}
            placeholder="e.g. RED"
          />
        </FormField>
        <FormField label="Label" error={createValueForm.getFieldProps('label').error} required>
          <TextField
            value={createValueForm.values.label}
            onChange={createValueForm.getFieldProps('label').onChange}
            onBlur={createValueForm.getFieldProps('label').onBlur}
            placeholder="e.g. Red"
          />
        </FormField>
        <FormField label="Value">
          <TextField
            value={createValueForm.values.value}
            onChange={createValueForm.getFieldProps('value').onChange}
            placeholder="Optional raw value"
          />
        </FormField>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tabs
// ---------------------------------------------------------------------------

function ValuesTab({ values, loaded, loading, onLoad, onCreate, onDelete }: {
  values: MasterValue[];
  loaded: boolean;
  loading: boolean;
  onLoad: () => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}): ReactNode {
  if (!loaded && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--maw-space-xl)' }}>
        <Button onClick={onLoad}>Load Values</Button>
      </div>
    );
  }
  if (loading && !loaded) return <PageLoader message="Loading values..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--maw-space-md)' }}>
        <span style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{values.length} values</span>
        <Button onClick={onCreate}>+ Add Value</Button>
      </div>
      <DataTable
        columns={[
          ...VALUE_COLUMNS,
          {
            key: 'actions' as keyof MasterValue,
            header: '',
            width: 70,
            render: (row) => (
              <Button variant="ghost" onClick={() => onDelete(row.id)} style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-danger)' }}>
                Delete
              </Button>
            ),
          },
        ]}
        data={values}
        keyField="id"
        emptyMessage="No values defined"
      />
    </div>
  );
}

function FieldsTab({ fields, loaded, loading, onLoad, onCreate, onDelete }: {
  fields: MasterField[];
  loaded: boolean;
  loading: boolean;
  onLoad: () => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}): ReactNode {
  if (!loaded && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--maw-space-xl)' }}>
        <Button onClick={onLoad}>Load Fields</Button>
      </div>
    );
  }
  if (loading && !loaded) return <PageLoader message="Loading fields..." />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--maw-space-md)' }}>
        <span style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{fields.length} fields</span>
        <Button onClick={onCreate}>+ Add Field</Button>
      </div>
      <DataTable
        columns={[
          ...FIELD_COLUMNS,
          {
            key: 'actions' as keyof MasterField,
            header: '',
            width: 70,
            render: (row) => (
              <Button variant="ghost" onClick={() => onDelete(row.id)} style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-danger)' }}>
                Delete
              </Button>
            ),
          },
        ]}
        data={fields}
        keyField="id"
        emptyMessage="No fields defined"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level view — list or detail
// ---------------------------------------------------------------------------

export function MastersView(): ReactNode {
  const [selected, setSelected] = useState<Master | null>(null);

  if (selected) {
    return <MasterDetail master={selected} onBack={() => setSelected(null)} />;
  }

  return <MasterList onSelect={setSelected} />;
}
