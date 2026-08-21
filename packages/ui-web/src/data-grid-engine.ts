import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DataGridSchema,
  DataGridSortState,
  DataGridPaginationState,
  ActiveFilter,
  TableQuery,
  TableResult,
  IDataSource,
  ClientDataSourceConfig,
  ServerDataSourceConfig,
  DataSourceMode,
  ExportFormatValue,
  DataGridColumn,
} from '@maw/sdk';

// ---------------------------------------------------------------------------
// Client-side data source
// ---------------------------------------------------------------------------

function createClientDataSource<T extends object>(
  config: ClientDataSourceConfig<T>,
): IDataSource<T> {
  return {
    mode: 'client' as DataSourceMode,
    async query(params: TableQuery): Promise<TableResult<T>> {
      let filtered = [...config.data];

      if (params.search) {
        const lower = params.search.toLowerCase();
        const fields = config.searchFields ?? (
          filtered.length > 0
            ? Object.keys(filtered[0] as object) as (keyof T & string)[]
            : []
        );
        filtered = filtered.filter((row) =>
          fields.some((f) => String((row as Record<string, unknown>)[f as string] ?? '').toLowerCase().includes(lower)),
        );
      }

      if (params.filters && params.filters.length > 0) {
        for (const filter of params.filters) {
          filtered = filtered.filter((row) => {
            const val = (row as Record<string, unknown>)[filter.field];
            return applyFilter(val, filter.operator, filter.value);
          });
        }
      }

      if (params.sort) {
        const { field, direction } = params.sort;
        filtered.sort((a, b) => {
          const av = String((a as Record<string, unknown>)[field] ?? '');
          const bv = String((b as Record<string, unknown>)[field] ?? '');
          const cmp = av.localeCompare(bv, undefined, { numeric: true });
          return direction === 'asc' ? cmp : -cmp;
        });
      }

      const total = filtered.length;
      const start = (params.page - 1) * params.pageSize;
      const data = filtered.slice(start, start + params.pageSize);

      return { data, total, page: params.page, pageSize: params.pageSize };
    },
  };
}

function applyFilter(val: unknown, operator: string, filterValue: unknown): boolean {
  const str = String(val ?? '').toLowerCase();
  const fStr = String(filterValue ?? '').toLowerCase();

  switch (operator) {
    case 'eq': return str === fStr;
    case 'neq': return str !== fStr;
    case 'contains': return str.includes(fStr);
    case 'not_contains': return !str.includes(fStr);
    case 'starts_with': return str.startsWith(fStr);
    case 'ends_with': return str.endsWith(fStr);
    case 'gt': return Number(val) > Number(filterValue);
    case 'gte': return Number(val) >= Number(filterValue);
    case 'lt': return Number(val) < Number(filterValue);
    case 'lte': return Number(val) <= Number(filterValue);
    case 'in': return Array.isArray(filterValue) && filterValue.includes(val);
    case 'not_in': return Array.isArray(filterValue) && !filterValue.includes(val);
    case 'between': {
      if (!Array.isArray(filterValue) || filterValue.length < 2) return true;
      const n = Number(val);
      return n >= Number(filterValue[0]) && n <= Number(filterValue[1]);
    }
    case 'is_empty': return val == null || str === '';
    case 'is_not_empty': return val != null && str !== '';
    default: return true;
  }
}

// ---------------------------------------------------------------------------
// Server-side data source
// ---------------------------------------------------------------------------

function createServerDataSource<T extends object>(
  config: ServerDataSourceConfig<T>,
): IDataSource<T> {
  return {
    mode: 'server' as DataSourceMode,
    query: config.fetchFn,
  };
}

// ---------------------------------------------------------------------------
// useDataGrid — core engine hook
// ---------------------------------------------------------------------------

export interface UseDataGridOptions<T extends object> {
  readonly schema: DataGridSchema<T>;
  readonly dataSource: IDataSource<T> | ClientDataSourceConfig<T> | ServerDataSourceConfig<T>;
  readonly initialSearch?: string;
  readonly initialFilters?: readonly ActiveFilter[];
  readonly initialSort?: DataGridSortState;
  readonly initialPage?: number;
  readonly permissions?: ReadonlySet<string>;
}

export interface UseDataGridReturn<T extends object> {
  readonly data: readonly T[];
  readonly loading: boolean;
  readonly error: Error | null;

  readonly sort: DataGridSortState | undefined;
  readonly onSort: (field: string) => void;
  readonly setSort: (sort: DataGridSortState | undefined) => void;

  readonly pagination: DataGridPaginationState;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: number) => void;

  readonly search: string;
  readonly onSearchChange: (query: string) => void;

  readonly filters: readonly ActiveFilter[];
  readonly onFilterChange: (filters: readonly ActiveFilter[]) => void;
  readonly addFilter: (filter: ActiveFilter) => void;
  readonly removeFilter: (field: string) => void;
  readonly clearFilters: () => void;

  readonly selectedKeys: ReadonlySet<string>;
  readonly onSelectionChange: (keys: Set<string>) => void;
  readonly selectAll: () => void;
  readonly deselectAll: () => void;
  readonly isAllSelected: boolean;
  readonly selectedRows: readonly T[];

  readonly expandedKeys: ReadonlySet<string>;
  readonly toggleExpanded: (key: string) => void;
  readonly collapseAll: () => void;

  readonly visibleColumns: readonly DataGridColumn<T>[];
  readonly columnVisibility: Record<string, boolean>;
  readonly setColumnVisibility: (columnId: string, visible: boolean) => void;
  readonly columnOrder: readonly string[];
  readonly setColumnOrder: (order: readonly string[]) => void;

  readonly refetch: () => void;
  readonly exportData: (format: ExportFormatValue) => void;

  readonly hasPermission: (code: string) => boolean;
}

export function useDataGrid<T extends object>(options: UseDataGridOptions<T>): UseDataGridReturn<T> {
  const { schema, permissions } = options;

  const source = useMemo<IDataSource<T>>(() => {
    if ('query' in options.dataSource && typeof options.dataSource.query === 'function') {
      return options.dataSource as IDataSource<T>;
    }
    if ('fetchFn' in options.dataSource) {
      return createServerDataSource(options.dataSource as ServerDataSourceConfig<T>);
    }
    return createClientDataSource(options.dataSource as ClientDataSourceConfig<T>);
  }, [options.dataSource]);

  const defaultPageSize = schema.pagination?.defaultPageSize ?? 25;

  const [data, setData] = useState<readonly T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [sort, setSortState] = useState<DataGridSortState | undefined>(
    options.initialSort ?? schema.sort?.defaultSort,
  );
  const [page, setPage] = useState(options.initialPage ?? 1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(options.initialSearch ?? '');
  const [filters, setFilters] = useState<readonly ActiveFilter[]>(options.initialFilters ?? []);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const [columnVisibility, setColumnVisibilityState] = useState<Record<string, boolean>>(() => {
    const vis: Record<string, boolean> = {};
    for (const col of schema.columns) {
      vis[col.id] = col.visible !== false;
    }
    return vis;
  });

  const [columnOrder, setColumnOrder] = useState<readonly string[]>(
    () => schema.columns.map((c) => c.id),
  );

  const fetchIdRef = useRef(0);

  const fetchData = useCallback(() => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    const query: TableQuery = { page, pageSize, search: search || undefined, filters: filters.length > 0 ? filters : undefined, sort };

    source.query(query).then((result) => {
      if (id !== fetchIdRef.current) return;
      setData(result.data);
      setTotal(result.total);
      setLoading(false);
    }).catch((err: unknown) => {
      if (id !== fetchIdRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    });
  }, [source, page, pageSize, search, filters, sort]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onSort = useCallback((field: string) => {
    setSortState((prev) => {
      if (prev?.field === field) {
        return prev.direction === 'asc'
          ? { field, direction: 'desc' as const }
          : undefined;
      }
      return { field, direction: 'asc' as const };
    });
    setPage(1);
  }, []);

  const setSort = useCallback((s: DataGridSortState | undefined) => {
    setSortState(s);
    setPage(1);
  }, []);

  const onPageChange = useCallback((p: number) => setPage(p), []);
  const onPageSizeChange = useCallback((s: number) => { setPageSize(s); setPage(1); }, []);

  const onSearchChange = useCallback((q: string) => { setSearch(q); setPage(1); }, []);

  const onFilterChange = useCallback((f: readonly ActiveFilter[]) => { setFilters(f); setPage(1); }, []);
  const addFilter = useCallback((f: ActiveFilter) => {
    setFilters((prev) => [...prev.filter((p) => p.field !== f.field), f]);
    setPage(1);
  }, []);
  const removeFilter = useCallback((field: string) => {
    setFilters((prev) => prev.filter((f) => f.field !== field));
    setPage(1);
  }, []);
  const clearFilters = useCallback(() => { setFilters([]); setPage(1); }, []);

  const onSelectionChange = useCallback((keys: Set<string>) => setSelectedKeys(keys), []);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(data.map((row) => String((row as Record<string, unknown>)[schema.keyField]))));
  }, [data, schema.keyField]);

  const deselectAll = useCallback(() => setSelectedKeys(new Set()), []);

  const isAllSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((row) => selectedKeys.has(String((row as Record<string, unknown>)[schema.keyField])));
  }, [data, selectedKeys, schema.keyField]);

  const selectedRows = useMemo(
    () => data.filter((row) => selectedKeys.has(String((row as Record<string, unknown>)[schema.keyField]))),
    [data, selectedKeys, schema.keyField],
  );

  const toggleExpanded = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (!schema.expansion?.allowMultiple) next.clear();
        next.add(key);
      }
      return next;
    });
  }, [schema.expansion?.allowMultiple]);

  const collapseAll = useCallback(() => setExpandedKeys(new Set()), []);

  const visibleColumns = useMemo(() => {
    const ordered = columnOrder
      .map((id) => schema.columns.find((c) => c.id === id))
      .filter((c): c is DataGridColumn<T> => c != null && columnVisibility[c.id] !== false);
    return ordered;
  }, [schema.columns, columnOrder, columnVisibility]);

  const setColumnVisibility = useCallback((columnId: string, visible: boolean) => {
    setColumnVisibilityState((prev) => ({ ...prev, [columnId]: visible }));
  }, []);

  const hasPermission = useCallback((code: string) => {
    if (!permissions) return true;
    return permissions.has(code);
  }, [permissions]);

  const exportData = useCallback((format: ExportFormatValue) => {
    const exportCols = visibleColumns.filter((c) => c.field);

    if (format === 'csv') {
      const header = exportCols.map((c) => c.header).join(',');
      const rows = data.map((row) =>
        exportCols.map((c) => {
          const val = c.exportFormatter
            ? c.exportFormatter((row as Record<string, unknown>)[c.field as string], row)
            : String((row as Record<string, unknown>)[c.field as string] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(','),
      );
      const csv = [header, ...rows].join('\n');
      downloadBlob(csv, `${schema.export?.filename ?? 'export'}.csv`, 'text/csv');
    } else if (format === 'json') {
      const jsonData = data.map((row) => {
        const obj: Record<string, unknown> = {};
        for (const col of exportCols) {
          if (col.field) {
            obj[col.field] = col.exportFormatter
              ? col.exportFormatter((row as Record<string, unknown>)[col.field], row)
              : (row as Record<string, unknown>)[col.field];
          }
        }
        return obj;
      });
      downloadBlob(JSON.stringify(jsonData, null, 2), `${schema.export?.filename ?? 'export'}.json`, 'application/json');
    }
  }, [visibleColumns, data, schema.export?.filename]);

  return {
    data,
    loading,
    error,
    sort,
    onSort,
    setSort,
    pagination: { page, pageSize, total },
    onPageChange,
    onPageSizeChange,
    search,
    onSearchChange,
    filters,
    onFilterChange,
    addFilter,
    removeFilter,
    clearFilters,
    selectedKeys,
    onSelectionChange,
    selectAll,
    deselectAll,
    isAllSelected,
    selectedRows,
    expandedKeys,
    toggleExpanded,
    collapseAll,
    visibleColumns,
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    refetch: fetchData,
    exportData,
    hasPermission,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Re-export data source factories
export { createClientDataSource, createServerDataSource };
