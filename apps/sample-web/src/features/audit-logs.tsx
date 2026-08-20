import { useCallback, useState, type ReactNode } from 'react';
import { ApiError } from '@maw/api-client';
import { Button, Card, TextField, useDynamicAccess } from '@maw/ui-web';
import { palette, spacing, typography } from '@maw/theme';
import { client } from '../api';
import { badgeStyle, cardStyle, tableStyle, tdStyle, thStyle } from '../styles';

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET':
      return '#2563eb';
    case 'POST':
      return '#16a34a';
    case 'PUT':
    case 'PATCH':
      return '#d97706';
    case 'DELETE':
      return '#dc2626';
    default:
      return palette.fgMuted;
  }
}

export function AuditLogsPanel(): ReactNode {
  const { can } = useDynamicAccess();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [exporting, setExporting] = useState(false);

  const loadLogs = useCallback(() => {
    setLoading(true);
    setErr(null);
    const params = new URLSearchParams();
    if (filterUser !== '') params.set('userId', filterUser);
    if (filterResource !== '') params.set('resource', filterResource);
    const qs = params.toString();
    client
      .request<{ logs: AuditEntry[] }>(`/audit-logs${qs !== '' ? `?${qs}` : ''}`)
      .then((r) => setLogs(r.logs))
      .catch((e: ApiError) => setErr(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  }, [filterUser, filterResource]);

  const handleExport = useCallback(() => {
    setExporting(true);
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
      })
      .catch((e: ApiError) => setErr(`Export failed: ${e.status}`))
      .finally(() => setExporting(false));
  }, []);

  return (
    <Card style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <h3 style={{ margin: 0 }}>Audit Logs</h3>
        {can('Export_AuditLogs') && (
          <Button variant="ghost" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
        <TextField
          label="Filter by user"
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          style={{ flex: 1 }}
        />
        <TextField
          label="Filter by resource"
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
          style={{ flex: 1 }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button onClick={loadLogs} disabled={loading}>
            {loading ? 'Loading…' : 'Search'}
          </Button>
        </div>
      </div>

      {err !== null && <p style={{ color: palette.danger }}>{err}</p>}

      {logs.length === 0 && !loading && (
        <p style={{ color: palette.fgMuted, textAlign: 'center', padding: spacing.lg }}>
          No audit logs yet. Click Search, or perform some actions first.
        </p>
      )}

      {logs.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Resource</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={tdStyle}>{formatTime(log.timestamp)}</td>
                  <td style={tdStyle}>
                    <code style={{ fontSize: typography.size.sm }}>{log.userId}</code>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badgeStyle, background: methodColor(log.action) }}>{log.action}</span>
                  </td>
                  <td style={tdStyle}>{log.resource}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: (log.details?.statusCode as number) < 400 ? palette.success : palette.danger,
                      }}
                    >
                      {String(log.details?.statusCode ?? '')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
