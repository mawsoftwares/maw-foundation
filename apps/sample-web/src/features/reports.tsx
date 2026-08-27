import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Button,
  Card,
  Stack,
  Badge,
  Alert,
  PageLoader,
  ErrorState,
  useToast,
  DataTable,
  type ColumnDef,
  type SortState,
} from '@mawsoftwares/ui-web';
import { client } from '../api';

interface ReportColumnDef {
  readonly field: string;
  readonly label: string;
  readonly type: string;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly aggregatable?: boolean;
}

interface ReportDefinitionInfo {
  readonly name: string;
  readonly description?: string;
  readonly columns: readonly ReportColumnDef[];
  readonly defaultSort?: readonly { field: string; direction: string }[];
}

interface ReportResult {
  readonly rows: Record<string, unknown>[];
  readonly total: number;
  readonly executionTimeMs: number;
  readonly reportId?: string;
}

type OrderRow = Record<string, unknown> & { id: string };

export function ReportsView(): ReactNode {
  const toast = useToast();
  const [definitions, setDefinitions] = useState<ReportDefinitionInfo[]>([]);
  const [selectedDef, setSelectedDef] = useState<ReportDefinitionInfo | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sort, setSort] = useState<SortState | undefined>();
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');

  const loadDefinitions = useCallback(async () => {
    try {
      const res = await client.request<{ definitions: ReportDefinitionInfo[] }>('/reporting/definitions');
      setDefinitions(res.definitions);
      if (res.definitions.length > 0) {
        const first = res.definitions[0]!;
        setSelectedDef(first);
        if (first.defaultSort?.[0]) {
          setSort({ column: first.defaultSort[0].field, direction: first.defaultSort[0].direction as 'asc' | 'desc' });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load definitions');
    } finally {
      setInitLoading(false);
    }
  }, []);

  useEffect(() => { void loadDefinitions(); }, [loadDefinitions]);

  const runReport = useCallback(async (p = page) => {
    if (!selectedDef) return;
    setLoading(true);
    setError(undefined);
    try {
      const body: Record<string, unknown> = {
        definitionName: selectedDef.name,
        pagination: { page: p, pageSize },
      };
      if (sort) {
        body.sorting = [{ field: sort.column, direction: sort.direction }];
      }
      if (filterField && filterValue) {
        body.filters = {
          logic: 'AND',
          conditions: [{ field: filterField, operator: 'contains', value: filterValue }],
        };
      }
      const res = await client.request<ReportResult>('/reporting/run', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      setResult(res);
      setPage(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report failed');
      toast.error('Report execution failed');
    } finally {
      setLoading(false);
    }
  }, [selectedDef, sort, filterField, filterValue, pageSize, page, toast]);

  if (error && !result) return <ErrorState title="Report Error" message={error} retry={() => void loadDefinitions()} />;
  if (initLoading) return <PageLoader message="Loading report definitions..." />;

  const tableColumns: ColumnDef<OrderRow>[] = selectedDef
    ? selectedDef.columns.map((col) => ({
        key: col.field,
        header: col.label,
        sortable: col.sortable,
        width: col.field === 'id' ? 120 : undefined,
        render: (row: OrderRow) => {
          const val = row[col.field];
          if (col.type === 'NUMBER' && typeof val === 'number') return val.toLocaleString();
          if (col.type === 'DATE' && typeof val === 'string') return new Date(val).toLocaleDateString();
          return String(val ?? '');
        },
      }))
    : [];

  const tableRows: OrderRow[] = result
    ? result.rows.map((row, i) => ({ ...row, id: (row.id as string) ?? String(i) }))
    : [];

  return (
    <div>
      <Stack direction="row" align="center" style={{ justifyContent: 'space-between', marginBottom: 'var(--maw-space-lg)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>Reports</h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>
            Run and analyze reports from registered data sources
          </p>
        </div>
        {definitions.length > 0 && (
          <Stack direction="row" gap="var(--maw-space-sm)">
            {definitions.map((def) => (
              <button
                key={def.name}
                onClick={() => { setSelectedDef(def); setResult(null); setPage(1); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <Badge variant={selectedDef?.name === def.name ? 'info' : 'default'}>
                  {def.name}
                </Badge>
              </button>
            ))}
          </Stack>
        )}
      </Stack>

      {selectedDef && (
        <Card style={{ marginBottom: 'var(--maw-space-lg)', padding: 'var(--maw-space-md)' }}>
          <Stack direction="row" align="center" gap="var(--maw-space-md)" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 'var(--maw-text-sm)', fontWeight: 600, color: 'var(--maw-fg)' }}>{selectedDef.name}</div>
              <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>{selectedDef.description}</div>
            </div>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 'var(--maw-radius-sm)', border: '1px solid var(--maw-border)', fontSize: 'var(--maw-text-xs)', background: 'var(--maw-bg)', color: 'var(--maw-fg)' }}
            >
              <option value="">Filter by...</option>
              {selectedDef.columns.filter((c) => c.filterable && c.type === 'STRING').map((c) => (
                <option key={c.field} value={c.field}>{c.label}</option>
              ))}
            </select>
            {filterField && (
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Filter value..."
                style={{ padding: '6px 8px', borderRadius: 'var(--maw-radius-sm)', border: '1px solid var(--maw-border)', fontSize: 'var(--maw-text-xs)', background: 'var(--maw-bg)', color: 'var(--maw-fg)', width: 160 }}
              />
            )}
            <Button onClick={() => void runReport(1)} disabled={loading}>
              {loading ? 'Running...' : 'Run Report'}
            </Button>
          </Stack>
        </Card>
      )}

      {error && result && <Alert variant="danger" style={{ marginBottom: 'var(--maw-space-md)' }}>{error}</Alert>}

      {result && (
        <>
          <Stack direction="row" align="center" gap="var(--maw-space-md)" style={{ marginBottom: 'var(--maw-space-md)' }}>
            <Badge variant="info">{result.total} total rows</Badge>
            <Badge variant="success">{result.executionTimeMs}ms</Badge>
            {result.reportId && <Badge variant="default">ID: {result.reportId.slice(0, 8)}</Badge>}
          </Stack>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable<OrderRow>
              columns={tableColumns}
              data={tableRows}
              keyField="id"
              sort={sort}
              onSort={(s) => { setSort(s); }}
              pagination={{ page, pageSize, total: result.total }}
              onPageChange={(p) => void runReport(p)}
              loading={loading}
              stickyHeader
            />
          </Card>
        </>
      )}

      {!result && !loading && selectedDef && (
        <Card style={{ textAlign: 'center', padding: 'var(--maw-space-xl)' }}>
          <p style={{ color: 'var(--maw-fgMuted)', margin: 0 }}>Configure filters and click "Run Report" to view data.</p>
        </Card>
      )}
    </div>
  );
}
