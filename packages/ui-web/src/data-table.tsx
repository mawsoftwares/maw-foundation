import { useCallback, useMemo, useState, type ReactNode, type CSSProperties } from 'react';
import { Checkbox, Select, IconButton, Stack, Spinner } from './components';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: readonly ColumnDef<T>[];
  data: readonly T[];
  keyField: keyof T;

  sort?: SortState;
  onSort?: (sort: SortState) => void;

  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];

  selectable?: boolean;
  selectedKeys?: ReadonlySet<string>;
  onSelectionChange?: (keys: Set<string>) => void;

  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;

  loading?: boolean;
  emptyMessage?: string;
  compact?: boolean;
  stickyHeader?: boolean;
  style?: CSSProperties;
}

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  sort,
  onSort,
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  selectable,
  selectedKeys,
  onSelectionChange,
  onRowClick,
  rowActions,
  loading,
  emptyMessage = 'No data',
  compact,
  stickyHeader,
  style,
}: DataTableProps<T>): ReactNode {
  const cellPadding = compact ? '6px 10px' : '10px 14px';

  const handleSort = useCallback(
    (col: string) => {
      if (!onSort) return;
      if (sort?.column === col) {
        onSort({ column: col, direction: sort.direction === 'asc' ? 'desc' : 'asc' });
      } else {
        onSort({ column: col, direction: 'asc' });
      }
    },
    [sort, onSort],
  );

  const allSelected = useMemo(() => {
    if (!selectable || !selectedKeys || data.length === 0) return false;
    return data.every((row) => selectedKeys.has(String(row[keyField])));
  }, [data, keyField, selectable, selectedKeys]);

  const toggleAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((row) => String(row[keyField]))));
    }
  }, [allSelected, data, keyField, onSelectionChange]);

  const toggleRow = useCallback(
    (key: string) => {
      if (!onSelectionChange || !selectedKeys) return;
      const next = new Set(selectedKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onSelectionChange(next);
    },
    [selectedKeys, onSelectionChange],
  );

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  return (
    <div style={{ ...base, ...style }}>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'var(--maw-text-sm)',
            color: 'var(--maw-fg)',
          }}
        >
          <thead>
            <tr>
              {selectable && (
                <th style={{ padding: cellPadding, width: 40, textAlign: 'center', position: stickyHeader ? 'sticky' : undefined, top: stickyHeader ? 0 : undefined, background: 'var(--maw-bgMuted)', borderBottom: '1px solid var(--maw-border)' }}>
                  <Checkbox label="" checked={allSelected} onChange={toggleAll} />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  style={{
                    ...base,
                    padding: cellPadding,
                    textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
                    width: col.width,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: col.sortable ? 'none' : undefined,
                    fontWeight: 600,
                    fontSize: 'var(--maw-text-xs)',
                    color: 'var(--maw-fgMuted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--maw-border)',
                    background: 'var(--maw-bgMuted)',
                    whiteSpace: 'nowrap',
                    position: stickyHeader ? 'sticky' : undefined,
                    top: stickyHeader ? 0 : undefined,
                  }}
                >
                  {col.header}
                  {col.sortable && sort?.column === col.key && (
                    <span style={{ marginLeft: 4 }}>{sort.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              {rowActions !== undefined && (
                <th style={{ padding: cellPadding, width: 60, background: 'var(--maw-bgMuted)', borderBottom: '1px solid var(--maw-border)', position: stickyHeader ? 'sticky' : undefined, top: stickyHeader ? 0 : undefined }} />
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}
                  style={{ padding: 'var(--maw-space-xxl)', textAlign: 'center', color: 'var(--maw-fgMuted)' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {data.map((row, idx) => {
              const key = String(row[keyField]);
              const isSelected = selectedKeys?.has(key) ?? false;
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    cursor: onRowClick ? 'pointer' : undefined,
                    background: isSelected ? 'var(--maw-bgSubtle)' : undefined,
                    borderBottom: '1px solid var(--maw-border)',
                  }}
                >
                  {selectable && (
                    <td style={{ padding: cellPadding, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <Checkbox label="" checked={isSelected} onChange={() => toggleRow(key)} />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: cellPadding,
                        textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
                      }}
                    >
                      {col.render ? col.render(row, idx) : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                    </td>
                  ))}
                  {rowActions !== undefined && (
                    <td style={{ padding: cellPadding, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination !== undefined && totalPages > 0 && (
        <Stack
          direction="row"
          align="center"
          style={{
            justifyContent: 'space-between',
            padding: 'var(--maw-space-sm) var(--maw-space-md)',
            fontSize: 'var(--maw-text-xs)',
            color: 'var(--maw-fgMuted)',
            borderTop: '1px solid var(--maw-border)',
          }}
        >
          <Stack direction="row" align="center" gap="8px">
            <span>Rows per page:</span>
            <Select
              options={pageSizeOptions.map((s) => ({ value: String(s), label: String(s) }))}
              value={String(pagination.pageSize)}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              style={{ width: 64, fontSize: 'var(--maw-text-xs)', padding: '2px 4px' }}
            />
          </Stack>
          <div>
            {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </div>
          <Stack direction="row" gap="4px">
            <IconButton
              label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              ←
            </IconButton>
            <IconButton
              label="Next page"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              →
            </IconButton>
          </Stack>
        </Stack>
      )}

      {loading && (
        <Stack direction="column" align="center" style={{ padding: 'var(--maw-space-lg)' }}>
          <Spinner size={24} />
        </Stack>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useDataTable — local state management for client-side tables
// ---------------------------------------------------------------------------

export function useDataTable<T extends object>({
  data,
  keyField: _keyField,
  defaultPageSize = 25,
  defaultSort,
}: {
  data: readonly T[];
  keyField: keyof T;
  defaultPageSize?: number;
  defaultSort?: SortState;
}): {
  displayData: T[];
  sort: SortState | undefined;
  onSort: (s: SortState) => void;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  selectedKeys: Set<string>;
  onSelectionChange: (keys: Set<string>) => void;
  filter: string;
  setFilter: (f: string) => void;
} {
  const [sort, setSort] = useState<SortState | undefined>(defaultSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter) return [...data];
    const lower = filter.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) => String(v).toLowerCase().includes(lower)),
    );
  }, [data, filter]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sort.column] ?? '');
      const bv = String((b as Record<string, unknown>)[sort.column] ?? '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const displayData = sorted.slice(start, start + pageSize);

  const onPageChange = useCallback((p: number) => setPage(p), []);
  const onPageSizeChange = useCallback((s: number) => { setPageSize(s); setPage(1); }, []);

  return {
    displayData,
    sort,
    onSort: setSort,
    pagination: { page, pageSize, total },
    onPageChange,
    onPageSizeChange,
    selectedKeys,
    onSelectionChange: setSelectedKeys,
    filter,
    setFilter,
  };
}

// ---------------------------------------------------------------------------
// Export helper (CSV download)
// ---------------------------------------------------------------------------

export function exportToCsv<T extends object>(
  columns: readonly ColumnDef<T>[],
  data: readonly T[],
  filename = 'export.csv',
): void {
  const header = columns.map((c) => c.header).join(',');
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = String((row as Record<string, unknown>)[c.key] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(','),
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
