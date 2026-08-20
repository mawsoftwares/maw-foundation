import { useCallback, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import type { ColumnDef, SortState } from './data-table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrudConfig<T> {
  resourceName: string;
  columns: readonly ColumnDef<T>[];
  keyField: keyof T;
  fetchList: (params: ListParams) => Promise<ListResult<T>>;
  fetchOne?: (id: string) => Promise<T>;
  create?: (data: Partial<T>) => Promise<T>;
  update?: (id: string, data: Partial<T>) => Promise<T>;
  remove?: (id: string) => Promise<void>;
}

export interface ListParams {
  page: number;
  pageSize: number;
  sort?: SortState;
  filter?: string;
  filters?: Record<string, unknown>;
}

export interface ListResult<T> {
  data: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// useCrud hook — manages all CRUD state
// ---------------------------------------------------------------------------

export interface UseCrudReturn<T> {
  items: T[];
  total: number;
  loading: boolean;
  error: string | undefined;
  page: number;
  pageSize: number;
  sort: SortState | undefined;
  filter: string;
  selected: T | null;
  selectedKeys: Set<string>;

  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (sort: SortState) => void;
  setFilter: (filter: string) => void;
  setSelectedKeys: (keys: Set<string>) => void;

  refresh: () => void;
  select: (item: T | null) => void;
  createItem: (data: Partial<T>) => Promise<T | undefined>;
  updateItem: (id: string, data: Partial<T>) => Promise<T | undefined>;
  deleteItem: (id: string) => Promise<boolean>;
}

export function useCrud<T extends Record<string, unknown>>(config: CrudConfig<T>): UseCrudReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState>();
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<T | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    config
      .fetchList({ page, pageSize, sort, filter })
      .then((result) => {
        if (!alive) return;
        setItems(result.data);
        setTotal(result.total);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [page, pageSize, sort?.column, sort?.direction, filter, refreshKey, config]);

  const createItem = useCallback(
    async (data: Partial<T>) => {
      if (!config.create) return undefined;
      const item = await config.create(data);
      refresh();
      return item;
    },
    [config, refresh],
  );

  const updateItem = useCallback(
    async (id: string, data: Partial<T>) => {
      if (!config.update) return undefined;
      const item = await config.update(id, data);
      refresh();
      return item;
    },
    [config, refresh],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!config.remove) return false;
      await config.remove(id);
      refresh();
      return true;
    },
    [config, refresh],
  );

  return {
    items,
    total,
    loading,
    error,
    page,
    pageSize,
    sort,
    filter,
    selected,
    selectedKeys,
    setPage,
    setPageSize: useCallback((s: number) => { setPageSize(s); setPage(1); }, []),
    setSort,
    setFilter: useCallback((f: string) => { setFilter(f); setPage(1); }, []),
    setSelectedKeys,
    refresh,
    select: setSelected,
    createItem,
    updateItem,
    deleteItem,
  };
}

// ---------------------------------------------------------------------------
// ListPage — standard list layout with search, table, actions
// ---------------------------------------------------------------------------

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

export function ListPage({
  title,
  description,
  createLabel,
  onCreate,
  searchPlaceholder = 'Search...',
  filter,
  onFilterChange,
  toolbar,
  children,
  style,
}: {
  title: string;
  description?: string;
  createLabel?: string;
  onCreate?: () => void;
  searchPlaceholder?: string;
  filter?: string;
  onFilterChange?: (f: string) => void;
  toolbar?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ ...base, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--maw-space-lg)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>{title}</h1>
          {description !== undefined && (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', alignItems: 'center' }}>
          {toolbar}
          {createLabel !== undefined && onCreate !== undefined && (
            <button
              onClick={onCreate}
              style={{
                ...base,
                padding: 'var(--maw-space-sm) var(--maw-space-lg)',
                borderRadius: 'var(--maw-radius-md)',
                border: 'none',
                background: 'var(--maw-brand)',
                color: 'var(--maw-brandContrast)',
                fontSize: 'var(--maw-text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + {createLabel}
            </button>
          )}
        </div>
      </div>

      {onFilterChange !== undefined && (
        <div style={{ marginBottom: 'var(--maw-space-md)' }}>
          <input
            type="text"
            value={filter ?? ''}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              ...base,
              width: '100%',
              maxWidth: 320,
              padding: 'var(--maw-space-sm) var(--maw-space-md)',
              borderRadius: 'var(--maw-radius-md)',
              border: '1px solid var(--maw-border)',
              fontSize: 'var(--maw-text-sm)',
              color: 'var(--maw-fg)',
              background: 'var(--maw-bg)',
              outline: 'none',
            }}
          />
        </div>
      )}

      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormPage — standard create/edit layout
// ---------------------------------------------------------------------------

export function FormPage({
  title,
  onBack,
  onSubmit,
  submitLabel = 'Save',
  loading,
  dirty,
  children,
  style,
}: {
  title: string;
  onBack?: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
  dirty?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ ...base, maxWidth: 640, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-md)', marginBottom: 'var(--maw-space-xl)' }}>
        {onBack !== undefined && (
          <button
            onClick={onBack}
            style={{ ...base, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-lg)' }}
          >
            ←
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>{title}</h1>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        style={{
          background: 'var(--maw-bg)',
          border: '1px solid var(--maw-border)',
          borderRadius: 'var(--maw-radius-lg)',
          padding: 'var(--maw-space-xl)',
        }}
      >
        {children}

        <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', justifyContent: 'flex-end', marginTop: 'var(--maw-space-xl)', borderTop: '1px solid var(--maw-border)', paddingTop: 'var(--maw-space-lg)' }}>
          {onBack !== undefined && (
            <button
              type="button"
              onClick={onBack}
              style={{
                ...base,
                padding: 'var(--maw-space-sm) var(--maw-space-xl)',
                borderRadius: 'var(--maw-radius-md)',
                border: '1px solid var(--maw-border)',
                background: 'var(--maw-bg)',
                color: 'var(--maw-fg)',
                fontSize: 'var(--maw-text-sm)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || dirty === false}
            style={{
              ...base,
              padding: 'var(--maw-space-sm) var(--maw-space-xl)',
              borderRadius: 'var(--maw-radius-md)',
              border: 'none',
              background: 'var(--maw-brand)',
              color: 'var(--maw-brandContrast)',
              fontSize: 'var(--maw-text-sm)',
              fontWeight: 600,
              cursor: loading || dirty === false ? 'not-allowed' : 'pointer',
              opacity: loading || dirty === false ? 0.6 : 1,
            }}
          >
            {loading ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPage — standard detail/view layout
// ---------------------------------------------------------------------------

export function DetailPage({
  title,
  onBack,
  onEdit,
  onDelete,
  actions,
  children,
  style,
}: {
  title: string;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ ...base, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--maw-space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--maw-space-md)' }}>
          {onBack !== undefined && (
            <button
              onClick={onBack}
              style={{ ...base, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-lg)' }}
            >
              ←
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: 'var(--maw-text-xl)', fontWeight: 700, color: 'var(--maw-fg)' }}>{title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--maw-space-sm)' }}>
          {actions}
          {onEdit !== undefined && (
            <button
              onClick={onEdit}
              style={{ ...base, padding: 'var(--maw-space-sm) var(--maw-space-lg)', borderRadius: 'var(--maw-radius-md)', border: '1px solid var(--maw-border)', background: 'var(--maw-bg)', color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)', cursor: 'pointer' }}
            >
              Edit
            </button>
          )}
          {onDelete !== undefined && (
            <button
              onClick={onDelete}
              style={{ ...base, padding: 'var(--maw-space-sm) var(--maw-space-lg)', borderRadius: 'var(--maw-radius-md)', border: 'none', background: 'var(--maw-danger)', color: '#fff', fontSize: 'var(--maw-text-sm)', fontWeight: 600, cursor: 'pointer' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          background: 'var(--maw-bg)',
          border: '1px solid var(--maw-border)',
          borderRadius: 'var(--maw-radius-lg)',
          padding: 'var(--maw-space-xl)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailField — key-value display for detail pages
// ---------------------------------------------------------------------------

export function DetailField({
  label,
  value,
  style,
}: {
  label: string;
  value: ReactNode;
  style?: CSSProperties;
}): ReactNode {
  return (
    <div style={{ marginBottom: 'var(--maw-space-md)', ...style }}>
      <div style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', fontWeight: 500, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: 'var(--maw-text-md)', color: 'var(--maw-fg)' }}>
        {value ?? <span style={{ color: 'var(--maw-fgSubtle)' }}>—</span>}
      </div>
    </div>
  );
}
