import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import {
  ListPage, DataTable, Badge, Button, Modal, TextField, TextArea, Select, Toggle,
  useForm, useToast, ErrorState, PageLoader, Tabs, Card,
  type ColumnDef,
} from '@mawsoftwares/ui-web';
import { client } from '../api';

// ---------------------------------------------------------------------------
// Messaging — Email/SMS/WhatsApp templates, provider credentials ("Masters"),
// and a send-attempt audit trail, all reachable from one screen (Tabs) rather
// than separate pages, mirroring the pattern already used for RBAC's
// Roles / Modules & Permissions consolidation. Ported from the servicemate
// project's message-templates / email-templates / integration-credentials /
// message-send-logs features.
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'email-templates', label: 'Email Templates' },
  { key: 'sms-templates', label: 'SMS Templates' },
  { key: 'whatsapp-templates', label: 'WhatsApp Templates' },
  { key: 'masters', label: 'Masters (Credentials)' },
  { key: 'logs', label: 'Send Logs' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export function MessagingView(): ReactNode {
  const [activeTab, setActiveTab] = useState<TabKey>('email-templates');

  return (
    <div>
      <h1 style={{ margin: '0 0 4px', fontSize: 'var(--maw-text-xl)', color: 'var(--maw-fg)' }}>Messaging</h1>
      <p style={{ margin: '0 0 var(--maw-space-lg)', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
        Manage Email, SMS, and WhatsApp templates, their provider credentials ("Masters"), and view the send log —
        all in one place.
      </p>
      <Tabs
        tabs={TABS as unknown as { key: string; label: string }[]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        style={{ marginBottom: 'var(--maw-space-lg)' }}
      />
      {activeTab === 'email-templates' && <EmailTemplatesTab />}
      {activeTab === 'sms-templates' && <MessageTemplatesTab channel="sms" />}
      {activeTab === 'whatsapp-templates' && <MessageTemplatesTab channel="whatsapp" />}
      {activeTab === 'masters' && <MastersTab />}
      {activeTab === 'logs' && <LogsTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

interface EmailTemplate {
  id: string;
  identifier: string;
  name: string;
  subject: string;
  body: string;
  fromAddress: string | null;
  toAddress: string | null;
  ccAddress: string | null;
  bccAddress: string | null;
  description: string | null;
  status: string;
}

function EmailTemplatesTab(): ReactNode {
  const toast = useToast();
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client.request<{ data: EmailTemplate[] }>('/api/v1/messaging/email-templates')
      .then((r) => setItems(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this email template?')) return;
    try {
      await client.request(`/api/v1/messaging/email-templates/${id}`, { method: 'DELETE' });
      toast.success('Email template deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const emptyValues = { identifier: '', name: '', subject: '', body: '', fromAddress: '', toAddress: '', ccAddress: '', bccAddress: '', description: '', status: 'active' };

  const createForm = useForm({
    initialValues: emptyValues,
    fields: { identifier: { required: true }, name: { required: true }, subject: { required: true }, body: { required: true } },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/messaging/email-templates', { method: 'POST', body: JSON.stringify(values) });
        toast.success('Email template created');
        setShowCreate(false);
        createForm.reset();
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const editForm = useForm({
    initialValues: emptyValues,
    fields: { name: { required: true }, subject: { required: true }, body: { required: true } },
    onSubmit: async (values) => {
      if (!editing) return;
      try {
        await client.request(`/api/v1/messaging/email-templates/${editing.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Email template updated');
        setEditing(null);
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({
        identifier: editing.identifier, name: editing.name, subject: editing.subject, body: editing.body,
        fromAddress: editing.fromAddress ?? '', toAddress: editing.toAddress ?? '', ccAddress: editing.ccAddress ?? '',
        bccAddress: editing.bccAddress ?? '', description: editing.description ?? '', status: editing.status,
      });
    }
  }, [editing]);

  if (error) return <ErrorState title="Failed to load email templates" message={error} retry={load} />;
  if (loading && items.length === 0) return <PageLoader message="Loading email templates..." />;

  const columns: ColumnDef<EmailTemplate>[] = [
    { key: 'identifier', header: 'Identifier', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'subject', header: 'Subject' },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge> },
    {
      key: 'actions' as any,
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setEditing(row)}>Edit</Button>
          <Button variant="ghost" onClick={() => remove(row.id)} style={{ color: 'var(--maw-danger)' }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <ListPage title="" createLabel="Create Email Template" onCreate={() => setShowCreate(true)}>
      <DataTable columns={columns} data={items} keyField="id" emptyMessage="No email templates found" />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Email Template">
        <EmailTemplateForm form={createForm} onCancel={() => setShowCreate(false)} submitLabel="Create" showIdentifier />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit: ${editing?.identifier}`}>
        <EmailTemplateForm form={editForm} onCancel={() => setEditing(null)} submitLabel="Save Changes" />
      </Modal>
    </ListPage>
  );
}

function EmailTemplateForm({ form, onCancel, submitLabel, showIdentifier }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any; onCancel: () => void; submitLabel: string; showIdentifier?: boolean;
}): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      {showIdentifier && (
        <TextField label="Identifier" required error={form.errors.identifier} value={form.values.identifier}
          onChange={(e) => form.setValue('identifier', (e.target as HTMLInputElement).value)} placeholder="e.g. welcome-email" />
      )}
      <TextField label="Name" required error={form.errors.name} value={form.values.name}
        onChange={(e) => form.setValue('name', (e.target as HTMLInputElement).value)} />
      <TextField label="Subject" required error={form.errors.subject} value={form.values.subject}
        onChange={(e) => form.setValue('subject', (e.target as HTMLInputElement).value)} placeholder="Supports {{variables}}" />
      <TextArea label="Body" required value={form.values.body} rows={6}
        onChange={(e) => form.setValue('body', (e.target as HTMLTextAreaElement).value)} placeholder="Supports {{variables}}" />
      <TextField label="From Address" value={form.values.fromAddress}
        onChange={(e) => form.setValue('fromAddress', (e.target as HTMLInputElement).value)} placeholder="Optional — overrides the Email Master default" />
      <TextField label="Default To" value={form.values.toAddress}
        onChange={(e) => form.setValue('toAddress', (e.target as HTMLInputElement).value)} placeholder="Optional" />
      <TextField label="Default CC" value={form.values.ccAddress}
        onChange={(e) => form.setValue('ccAddress', (e.target as HTMLInputElement).value)} placeholder="Optional" />
      <TextField label="Default BCC" value={form.values.bccAddress}
        onChange={(e) => form.setValue('bccAddress', (e.target as HTMLInputElement).value)} placeholder="Optional" />
      <TextArea label="Description" value={form.values.description} rows={2}
        onChange={(e) => form.setValue('description', (e.target as HTMLTextAreaElement).value)} />
      <Select label="Status" value={form.values.status} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
        onChange={(e) => form.setValue('status', (e.target as HTMLSelectElement).value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => form.handleSubmit()} disabled={form.submitting}>{submitLabel}</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SMS / WhatsApp Templates (shared component, parametrized by channel)
// ---------------------------------------------------------------------------

interface MessageTemplate {
  id: string;
  channel: string;
  identifier: string;
  name: string;
  body: string;
  description: string | null;
  status: string;
}

function MessageTemplatesTab({ channel }: { channel: 'sms' | 'whatsapp' }): ReactNode {
  const toast = useToast();
  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client.request<{ data: MessageTemplate[] }>(`/api/v1/messaging/templates?channel=${channel}`)
      .then((r) => setItems(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, [channel]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await client.request(`/api/v1/messaging/templates/${id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const emptyValues = { identifier: '', name: '', body: '', description: '', status: 'active' };

  const createForm = useForm({
    initialValues: emptyValues,
    fields: { identifier: { required: true }, name: { required: true }, body: { required: true } },
    onSubmit: async (values) => {
      try {
        await client.request('/api/v1/messaging/templates', { method: 'POST', body: JSON.stringify({ ...values, channel }) });
        toast.success('Template created');
        setShowCreate(false);
        createForm.reset();
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  const editForm = useForm({
    initialValues: emptyValues,
    fields: { name: { required: true }, body: { required: true } },
    onSubmit: async (values) => {
      if (!editing) return;
      try {
        await client.request(`/api/v1/messaging/templates/${editing.id}`, { method: 'PUT', body: JSON.stringify(values) });
        toast.success('Template updated');
        setEditing(null);
        load();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  useEffect(() => {
    if (editing) {
      editForm.reset({ identifier: editing.identifier, name: editing.name, body: editing.body, description: editing.description ?? '', status: editing.status });
    }
  }, [editing]);

  if (error) return <ErrorState title="Failed to load templates" message={error} retry={load} />;
  if (loading && items.length === 0) return <PageLoader message="Loading templates..." />;

  const columns: ColumnDef<MessageTemplate>[] = [
    { key: 'identifier', header: 'Identifier', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'body', header: 'Body', render: (row) => <span style={{ color: 'var(--maw-fgMuted)' }}>{row.body.slice(0, 60)}{row.body.length > 60 ? '…' : ''}</span> },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'active' ? 'success' : 'danger'}>{row.status}</Badge> },
    {
      key: 'actions' as any,
      header: 'Actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setEditing(row)}>Edit</Button>
          <Button variant="ghost" onClick={() => remove(row.id)} style={{ color: 'var(--maw-danger)' }}>Delete</Button>
        </div>
      ),
    },
  ];

  const label = channel === 'sms' ? 'SMS' : 'WhatsApp';

  return (
    <ListPage title="" createLabel={`Create ${label} Template`} onCreate={() => setShowCreate(true)}>
      <DataTable columns={columns} data={items} keyField="id" emptyMessage={`No ${label} templates found`} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={`Create ${label} Template`}>
        <MessageTemplateForm form={createForm} onCancel={() => setShowCreate(false)} submitLabel="Create" showIdentifier />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit: ${editing?.identifier}`}>
        <MessageTemplateForm form={editForm} onCancel={() => setEditing(null)} submitLabel="Save Changes" />
      </Modal>
    </ListPage>
  );
}

function MessageTemplateForm({ form, onCancel, submitLabel, showIdentifier }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any; onCancel: () => void; submitLabel: string; showIdentifier?: boolean;
}): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      {showIdentifier && (
        <TextField label="Identifier" required error={form.errors.identifier} value={form.values.identifier}
          onChange={(e) => form.setValue('identifier', (e.target as HTMLInputElement).value)} placeholder="e.g. otp-sms" />
      )}
      <TextField label="Name" required error={form.errors.name} value={form.values.name}
        onChange={(e) => form.setValue('name', (e.target as HTMLInputElement).value)} />
      <TextArea label="Body" required value={form.values.body} rows={5}
        onChange={(e) => form.setValue('body', (e.target as HTMLTextAreaElement).value)} placeholder="Supports {{variables}}" />
      <TextArea label="Description" value={form.values.description} rows={2}
        onChange={(e) => form.setValue('description', (e.target as HTMLTextAreaElement).value)} />
      <Select label="Status" value={form.values.status} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
        onChange={(e) => form.setValue('status', (e.target as HTMLSelectElement).value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => form.handleSubmit()} disabled={form.submitting}>{submitLabel}</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Masters (Credentials) — one row per channel (email/sms/whatsapp). Sensitive
// fields (pass/apiKey) come back masked as "********"; leaving them unchanged
// on save keeps the stored encrypted value, typing a new value replaces it.
// ---------------------------------------------------------------------------

interface Credential {
  id: string;
  channel: string;
  provider: string;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
}

const CHANNELS: { key: 'email' | 'sms' | 'whatsapp'; label: string; defaultProvider: string }[] = [
  { key: 'email', label: 'Email Master', defaultProvider: 'smtp' },
  { key: 'sms', label: 'SMS Master', defaultProvider: 'http' },
  { key: 'whatsapp', label: 'WhatsApp Master', defaultProvider: 'http' },
];

function MastersTab(): ReactNode {
  const toast = useToast();
  const [byChannel, setByChannel] = useState<Record<string, Credential>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [editingChannel, setEditingChannel] = useState<'email' | 'sms' | 'whatsapp' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    client.request<{ data: Credential[] }>('/api/v1/messaging/credentials')
      .then((r) => setByChannel(Object.fromEntries(r.data.map((c) => [c.channel, c]))))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState title="Failed to load credentials" message={error} retry={load} />;
  if (loading && Object.keys(byChannel).length === 0) return <PageLoader message="Loading masters..." />;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--maw-space-lg)' }}>
        {CHANNELS.map(({ key, label }) => {
          const cred = byChannel[key];
          return (
            <Card key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>{label}</div>
                {cred && <Badge variant={cred.isActive ? 'success' : 'danger'}>{cred.isActive ? 'Active' : 'Inactive'}</Badge>}
              </div>
              {cred ? (
                <p style={{ margin: '0 0 12px', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
                  Provider: {cred.provider}<br />Name: {cred.name}
                </p>
              ) : (
                <p style={{ margin: '0 0 12px', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>Not configured yet.</p>
              )}
              <Button onClick={() => setEditingChannel(key)}>{cred ? 'Edit' : 'Configure'}</Button>
            </Card>
          );
        })}
      </div>

      {editingChannel && (
        <CredentialModal
          channel={editingChannel}
          credential={byChannel[editingChannel]}
          onClose={() => setEditingChannel(null)}
          onSaved={() => { setEditingChannel(null); load(); toast.success('Master saved'); }}
        />
      )}
    </div>
  );
}

function CredentialModal({ channel, credential, onClose, onSaved }: {
  channel: 'email' | 'sms' | 'whatsapp'; credential?: Credential; onClose: () => void; onSaved: () => void;
}): ReactNode {
  const toast = useToast();
  const cfg = credential?.config ?? {};
  const defaults = CHANNELS.find((c) => c.key === channel)!;

  const form = useForm({
    initialValues: {
      provider: credential?.provider ?? defaults.defaultProvider,
      name: credential?.name ?? defaults.label,
      isActive: credential?.isActive ?? true,
      host: (cfg.host as string) ?? '',
      port: (cfg.port as string) ?? (channel === 'email' ? '587' : ''),
      secure: Boolean(cfg.secure),
      user: (cfg.user as string) ?? '',
      pass: (cfg.pass as string) ?? '',
      fromAddress: (cfg.fromAddress as string) ?? '',
      baseUrl: (cfg.baseUrl as string) ?? '',
      method: (cfg.method as string) ?? 'POST',
      apiKey: (cfg.apiKey as string) ?? '',
      authHeader: (cfg.authHeader as string) ?? '',
      authScheme: (cfg.authScheme as string) ?? 'Bearer',
      toField: (cfg.toField as string) ?? 'to',
      messageField: (cfg.messageField as string) ?? 'message',
      mode: (cfg.mode as string) ?? 'link',
    },
    fields: { provider: { required: true }, name: { required: true } },
    onSubmit: async (values) => {
      try {
        let config: Record<string, unknown>;
        if (channel === 'email') {
          config = { host: values.host, port: Number(values.port) || 587, secure: values.secure, user: values.user, pass: values.pass, fromAddress: values.fromAddress };
        } else if (channel === 'sms') {
          config = { baseUrl: values.baseUrl, method: values.method, apiKey: values.apiKey, authHeader: values.authHeader, authScheme: values.authScheme, toField: values.toField, messageField: values.messageField };
        } else {
          config = { mode: values.mode, baseUrl: values.baseUrl, apiKey: values.apiKey, authHeader: values.authHeader, authScheme: values.authScheme, toField: values.toField, messageField: values.messageField };
        }
        await client.request(`/api/v1/messaging/credentials/${channel}`, {
          method: 'PUT',
          body: JSON.stringify({ provider: values.provider, name: values.name, isActive: values.isActive, config }),
        });
        onSaved();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  });

  return (
    <Modal open onClose={onClose} title={defaults.label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
        <TextField label="Provider" required value={form.values.provider} onChange={(e) => form.setValue('provider', (e.target as HTMLInputElement).value)} />
        <TextField label="Name" required value={form.values.name} onChange={(e) => form.setValue('name', (e.target as HTMLInputElement).value)} />

        {channel === 'email' && (
          <>
            <TextField label="SMTP Host" value={form.values.host} onChange={(e) => form.setValue('host', (e.target as HTMLInputElement).value)} />
            <TextField label="SMTP Port" type="number" value={String(form.values.port)} onChange={(e) => form.setValue('port', (e.target as HTMLInputElement).value)} />
            <Toggle label="Use TLS (secure)" checked={form.values.secure} onChange={(v) => form.setValue('secure', v)} />
            <TextField label="Username" value={form.values.user} onChange={(e) => form.setValue('user', (e.target as HTMLInputElement).value)} />
            <TextField label="Password" type="password" value={form.values.pass} placeholder={credential ? 'Leave as ******** to keep current' : ''}
              onChange={(e) => form.setValue('pass', (e.target as HTMLInputElement).value)} />
            <TextField label="From Address" value={form.values.fromAddress} onChange={(e) => form.setValue('fromAddress', (e.target as HTMLInputElement).value)} />
          </>
        )}

        {channel === 'sms' && (
          <>
            <TextField label="Gateway Base URL" value={form.values.baseUrl} onChange={(e) => form.setValue('baseUrl', (e.target as HTMLInputElement).value)} placeholder="https://api.example.com/sms/send" />
            <Select label="HTTP Method" value={form.values.method} options={[{ value: 'POST', label: 'POST' }, { value: 'GET', label: 'GET' }]}
              onChange={(e) => form.setValue('method', (e.target as HTMLSelectElement).value)} />
            <TextField label="API Key" type="password" value={form.values.apiKey} placeholder={credential ? 'Leave as ******** to keep current' : ''}
              onChange={(e) => form.setValue('apiKey', (e.target as HTMLInputElement).value)} />
            <TextField label="Auth Header Name" value={form.values.authHeader} onChange={(e) => form.setValue('authHeader', (e.target as HTMLInputElement).value)} placeholder="authorization" />
            <TextField label="Auth Scheme" value={form.values.authScheme} onChange={(e) => form.setValue('authScheme', (e.target as HTMLInputElement).value)} placeholder="Bearer" />
            <TextField label="'To' Field Name" value={form.values.toField} onChange={(e) => form.setValue('toField', (e.target as HTMLInputElement).value)} />
            <TextField label="'Message' Field Name" value={form.values.messageField} onChange={(e) => form.setValue('messageField', (e.target as HTMLInputElement).value)} />
          </>
        )}

        {channel === 'whatsapp' && (
          <>
            <Select label="Mode" value={form.values.mode} options={[{ value: 'link', label: 'wa.me link (no API needed)' }, { value: 'api', label: 'HTTP API' }]}
              onChange={(e) => form.setValue('mode', (e.target as HTMLSelectElement).value)} />
            {form.values.mode === 'api' && (
              <>
                <TextField label="API Base URL" value={form.values.baseUrl} onChange={(e) => form.setValue('baseUrl', (e.target as HTMLInputElement).value)} />
                <TextField label="API Key" type="password" value={form.values.apiKey} placeholder={credential ? 'Leave as ******** to keep current' : ''}
                  onChange={(e) => form.setValue('apiKey', (e.target as HTMLInputElement).value)} />
                <TextField label="Auth Header Name" value={form.values.authHeader} onChange={(e) => form.setValue('authHeader', (e.target as HTMLInputElement).value)} placeholder="authorization" />
                <TextField label="Auth Scheme" value={form.values.authScheme} onChange={(e) => form.setValue('authScheme', (e.target as HTMLInputElement).value)} placeholder="Bearer" />
                <TextField label="'To' Field Name" value={form.values.toField} onChange={(e) => form.setValue('toField', (e.target as HTMLInputElement).value)} />
                <TextField label="'Message' Field Name" value={form.values.messageField} onChange={(e) => form.setValue('messageField', (e.target as HTMLInputElement).value)} />
              </>
            )}
          </>
        )}

        <Toggle label="Active" checked={form.values.isActive} onChange={(v) => form.setValue('isActive', v)} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => form.handleSubmit()} disabled={form.submitting}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Send Logs — read-only audit trail of every send attempt.
// ---------------------------------------------------------------------------

interface SendLog {
  id: string;
  channel: string;
  identifier: string | null;
  status: string;
  toAddress: string | null;
  renderedSubject: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

function LogsTab(): ReactNode {
  const [items, setItems] = useState<SendLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [channel, setChannel] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    const qs = channel ? `?channel=${channel}` : '';
    client.request<{ data: SendLog[] }>(`/api/v1/messaging/logs${qs}`)
      .then((r) => setItems(r.data))
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, [channel]);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState title="Failed to load send logs" message={error} retry={load} />;

  const columns: ColumnDef<SendLog>[] = [
    { key: 'channel', header: 'Channel', render: (row) => <Badge variant="info">{row.channel}</Badge> },
    { key: 'identifier', header: 'Template', render: (row) => row.identifier ?? '—' },
    { key: 'toAddress', header: 'To', render: (row) => row.toAddress ?? '—' },
    { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'sent' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'}>{row.status}</Badge> },
    { key: 'errorMessage', header: 'Error', render: (row) => row.errorMessage ?? '—' },
    { key: 'createdAt', header: 'When', render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, maxWidth: 220 }}>
        <Select label="Filter by channel" value={channel}
          options={[{ value: '', label: 'All channels' }, { value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }, { value: 'whatsapp', label: 'WhatsApp' }]}
          onChange={(e) => setChannel((e.target as HTMLSelectElement).value)} />
      </div>
      {loading && items.length === 0 ? (
        <PageLoader message="Loading send logs..." />
      ) : (
        <DataTable columns={columns} data={items} keyField="id" emptyMessage="No send attempts logged yet" />
      )}
    </div>
  );
}
