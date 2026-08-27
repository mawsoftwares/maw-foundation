import { useCallback, useState, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import { ListPage, DataTable, Badge, Button, TextField, useToast, ErrorState, PageLoader, type ColumnDef } from '@mawsoftwares/ui-web';
import { client } from '../api';

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
}

const COLUMNS: ColumnDef<AuditEntry>[] = [
  {
    key: 'timestamp',
    header: 'Time',
    sortable: true,
    width: 100,
    render: (row) => new Date(row.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  },
  { key: 'userId', header: 'User', sortable: true },
  {
    key: 'action',
    header: 'Method',
    width: 80,
    render: (row) => {
      const variant = row.action === 'GET' ? 'info' : row.action === 'POST' ? 'success' : row.action === 'DELETE' ? 'danger' : 'warning';
      return <Badge variant={variant}>{row.action}</Badge>;
    },
  },
  { key: 'resource', header: 'Resource', sortable: true },
  {
    key: 'status',
    header: 'Status',
    width: 80,
    render: (row) => {
      const code = row.details?.statusCode as number | undefined;
      return code !== undefined ? (
        <span style={{ color: code < 400 ? 'var(--maw-success)' : 'var(--maw-danger)' }}>{code}</span>
      ) : '—';
    },
  },
];

export function AuditLogsView(): ReactNode {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [filterUser, setFilterUser] = useState('');
  const [filterResource, setFilterResource] = useState('');

  const loadLogs = useCallback(() => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (filterUser) params.set('userId', filterUser);
    if (filterResource) params.set('resource', filterResource);
    const qs = params.toString();
    client
      .request<{ logs: AuditEntry[] }>(`/audit-logs${qs ? `?${qs}` : ''}`)
      .then((r) => { setLogs(r.logs); setLoaded(true); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  }, [filterUser, filterResource]);

  const handleExport = useCallback(() => {
    client
      .request<string>('/audit-logs/export')
      .then((csv) => {
        const blob = new Blob([typeof csv === 'string' ? csv : JSON.stringify(csv)], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-logs.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded');
      })
      .catch((e: ApiError) => toast.error(`Export failed: ${e.status}`));
  }, [toast]);

  if (error) return <ErrorState title="Failed to load audit logs" message={error} retry={loadLogs} />;
  if (loading && !loaded) return <PageLoader message="Loading audit logs..." />;

  return (
    <ListPage
      title="Audit Logs"
      description={loaded ? `${logs.length} entries` : undefined}
      toolbar={
        loaded ? <Button variant="ghost" onClick={handleExport}>Export CSV</Button> : undefined
      }
    >
      <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', marginBottom: 'var(--maw-space-md)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <TextField label="Filter by user" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <TextField label="Filter by resource" value={filterResource} onChange={(e) => setFilterResource(e.target.value)} />
        </div>
        <Button onClick={loadLogs} disabled={loading} style={{ marginBottom: 'var(--maw-space-md)' }}>
          {loading ? 'Loading...' : 'Search'}
        </Button>
      </div>

      {loaded && (
        <DataTable columns={COLUMNS} data={logs} keyField="id" stickyHeader emptyMessage="No audit logs. Perform some API actions first, then search." />
      )}
    </ListPage>
  );
}
