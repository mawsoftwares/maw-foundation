import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import { ListPage, DataTable, Badge, Button, TextField, useDynamicAccess, useToast, ErrorState, PageLoader, type ColumnDef } from '@mawsoftwares/ui-web';
import { client } from '../api';

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
}

const COLUMNS: ColumnDef<AuditEntry>[] = [
  {
    key: 'timestamp',
    header: 'Time',
    sortable: true,
    width: 160,
    render: (row) => {
      const d = new Date(row.timestamp);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    },
  },
  { key: 'userName', header: 'User', sortable: true, render: (row) => row.userName || row.userId },
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
  const { can } = useDynamicAccess();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    const qs = params.toString();
    client
      .request<{ logs: AuditEntry[], total: number }>(`/audit-logs${qs ? `?${qs}` : ''}`)
      .then((r) => { setLogs(r.logs); setTotal(r.total); setLoaded(true); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  }, [filterUser, filterResource, page, pageSize]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSearch = () => {
    setPage(1);
    loadLogs();
  };

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

  return (
    <ListPage
      title="Audit Logs"
      description={loaded ? `${total} entries` : undefined}
      toolbar={
        loaded && can('Export_AuditLogs') ? <Button variant="ghost" onClick={handleExport}>Export CSV</Button> : undefined
      }
    >
      <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', marginBottom: 'var(--maw-space-md)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <TextField label="Filter by user ID" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <div style={{ flex: 1 }}>
          <TextField label="Filter by resource" value={filterResource} onChange={(e) => setFilterResource(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        </div>
        <Button onClick={handleSearch} disabled={loading} style={{ marginBottom: 'var(--maw-space-md)' }}>
          {loading ? 'Loading...' : 'Search'}
        </Button>
      </div>

      <DataTable 
        columns={COLUMNS} 
        data={logs} 
        keyField="id" 
        stickyHeader 
        loading={loading}
        emptyMessage="No audit logs found."
        pagination={{ page, pageSize, total }}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </ListPage>
  );
}
