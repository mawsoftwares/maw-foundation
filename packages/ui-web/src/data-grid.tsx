import {
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type {
  DataGridSchema,
  DataGridColumn,
  DataGridRowAction,
  DataGridAction,
  ActiveFilter,
  ExportFormatValue,
  DataGridPaginationState,
  DataGridSortState,
  IDataSource,
  ClientDataSourceConfig,
  ServerDataSourceConfig,
} from '@mawsoftwares/sdk';
import { useDataGrid, type UseDataGridReturn } from './data-grid-engine';
import { Checkbox, Select, IconButton, Spinner, Stack } from './components';
import { SearchBar } from './components';
import { ConfirmationDialog } from './components';
import { useIsMobile, useMediaQuery, BREAKPOINTS } from './responsive';

const base: CSSProperties = { fontFamily: 'var(--maw-font-family)', boxSizing: 'border-box' };

// ---------------------------------------------------------------------------
// DataGrid props
// ---------------------------------------------------------------------------

export interface DataGridProps<T extends object> {
  readonly schema: DataGridSchema<T>;
  readonly dataSource: IDataSource<T> | ClientDataSourceConfig<T> | ServerDataSourceConfig<T>;
  readonly initialSearch?: string;
  readonly initialFilters?: readonly ActiveFilter[];
  readonly initialSort?: DataGridSortState;
  readonly initialPage?: number;
  readonly permissions?: ReadonlySet<string>;
  readonly title?: string;
  readonly description?: string;
  readonly headerActions?: ReactNode;
  readonly style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// DataGrid component
// ---------------------------------------------------------------------------

export function DataGrid<T extends object>({
  schema,
  dataSource,
  initialSearch,
  initialFilters,
  initialSort,
  initialPage,
  permissions,
  title,
  description,
  headerActions,
  style,
}: DataGridProps<T>): ReactNode {
  const engine = useDataGrid<T>({
    schema,
    dataSource,
    initialSearch,
    initialFilters,
    initialSort,
    initialPage,
    permissions,
  });

  const mobileBreakpoint = schema.responsive?.breakpoint ?? BREAKPOINTS.md;
  const isMobile = !useMediaQuery(`(min-width: ${mobileBreakpoint}px)`);
  const useCardLayout = isMobile && (schema.responsive?.cardLayout !== false);

  return (
    <div style={{ ...base, ...style }}>
      {/* Header */}
      {(title || description || headerActions) && (
        <DataGridHeader
          title={title}
          description={description}
          actions={headerActions}
        />
      )}

      {/* Toolbar: search, filters, bulk actions, export */}
      <DataGridToolbar
        schema={schema}
        engine={engine}
      />

      {/* Table or cards */}
      {engine.error ? (
        <DataGridError
          schema={schema as DataGridSchema<Record<string, unknown>>}
          onRetry={engine.refetch}
        />
      ) : useCardLayout ? (
        <DataGridCards schema={schema} engine={engine} />
      ) : (
        <DataGridTable schema={schema} engine={engine} />
      )}

      {/* Pagination */}
      {schema.pagination !== null && (
        <DataGridPagination
          config={schema.pagination}
          pagination={engine.pagination}
          onPageChange={engine.onPageChange}
          onPageSizeChange={engine.onPageSizeChange}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DataGridHeader({
  title,
  description,
  actions,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}): ReactNode {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 'var(--maw-space-md)',
    }}>
      <div>
        {title && <h2 style={{ ...base, margin: 0, fontSize: 'var(--maw-text-lg)', fontWeight: 600, color: 'var(--maw-fg)' }}>{title}</h2>}
        {description && <p style={{ ...base, margin: 'var(--maw-space-xs) 0 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fgMuted)' }}>{description}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--maw-space-sm)', flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

function DataGridToolbar<T extends object>({
  schema,
  engine,
}: {
  readonly schema: DataGridSchema<T>;
  readonly engine: UseDataGridReturn<T>;
}): ReactNode {
  const hasSearch = schema.search?.enabled !== false && schema.search !== undefined;
  const hasFilters = schema.filters && schema.filters.length > 0;
  const hasExport = schema.export?.enabled;
  const hasBulkActions = schema.bulkActions && schema.bulkActions.length > 0;
  const hasSelectedRows = engine.selectedKeys.size > 0;

  if (!hasSearch && !hasFilters && !hasExport && !hasBulkActions) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--maw-space-sm)',
      marginBottom: 'var(--maw-space-md)',
      flexWrap: 'wrap',
    }}>
      {hasSearch && (
        <div style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <SearchBar
            value={engine.search}
            onChange={engine.onSearchChange}
            placeholder={schema.search?.placeholder ?? 'Search…'}
            debounceMs={schema.search?.debounceMs ?? 300}
          />
        </div>
      )}

      {hasFilters && (
        <DataGridFilterChips
          filters={engine.filters}
          definitions={schema.filters!}
          onRemove={engine.removeFilter}
          onClear={engine.clearFilters}
        />
      )}

      <div style={{ flex: 1 }} />

      {hasSelectedRows && hasBulkActions && (
        <DataGridBulkActions
          actions={schema.bulkActions!}
          selectedRows={engine.selectedRows}
          hasPermission={engine.hasPermission}
        />
      )}

      {hasExport && (
        <DataGridExportButton
          formats={schema.export!.formats ?? ['csv']}
          onExport={engine.exportData}
          hasPermission={schema.export!.permission ? engine.hasPermission(schema.export!.permission) : true}
        />
      )}
    </div>
  );
}

function DataGridFilterChips({
  filters,
  definitions,
  onRemove,
  onClear,
}: {
  readonly filters: readonly ActiveFilter[];
  readonly definitions: readonly import('@mawsoftwares/sdk').DataGridFilterDef[];
  readonly onRemove: (field: string) => void;
  readonly onClear: () => void;
}): ReactNode {
  if (filters.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 'var(--maw-space-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
      {filters.map((f) => {
        const def = definitions.find((d) => d.field === f.field);
        return (
          <span key={f.field} style={{
            ...base,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 'var(--maw-radius-full)',
            background: 'var(--maw-bgSubtle)',
            fontSize: 'var(--maw-text-xs)',
            color: 'var(--maw-fg)',
            border: '1px solid var(--maw-border)',
          }}>
            {def?.label ?? f.field}: {String(f.value)}
            <button
              onClick={() => onRemove(f.field)}
              style={{ ...base, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maw-fgMuted)', padding: 0, fontSize: 'var(--maw-text-xs)' }}
              aria-label={`Remove ${def?.label ?? f.field} filter`}
            >✕</button>
          </span>
        );
      })}
      {filters.length > 1 && (
        <button
          onClick={onClear}
          style={{ ...base, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--maw-brand)', fontSize: 'var(--maw-text-xs)', textDecoration: 'underline' }}
        >Clear all</button>
      )}
    </div>
  );
}

function DataGridBulkActions<T extends object>({
  actions,
  selectedRows,
  hasPermission,
}: {
  readonly actions: readonly DataGridAction<T>[];
  readonly selectedRows: readonly T[];
  readonly hasPermission: (code: string) => boolean;
}): ReactNode {
  const [confirmAction, setConfirmAction] = useState<DataGridAction<T> | null>(null);

  const visibleActions = actions.filter((a) => {
    if (a.permission && !hasPermission(a.permission)) return false;
    if (typeof a.hidden === 'function') return !a.hidden(selectedRows);
    return !a.hidden;
  });

  if (visibleActions.length === 0) return null;

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--maw-space-xs)', alignItems: 'center' }}>
        <span style={{ ...base, fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
          {selectedRows.length} selected
        </span>
        {visibleActions.map((action) => {
          const disabled = typeof action.disabled === 'function' ? action.disabled(selectedRows) : action.disabled;
          return (
            <button
              key={action.id}
              disabled={disabled}
              onClick={() => action.confirm ? setConfirmAction(action) : action.handler(selectedRows)}
              style={{
                ...base,
                padding: '4px 12px',
                borderRadius: 'var(--maw-radius-sm)',
                border: action.variant === 'danger' ? 'none' : '1px solid var(--maw-border)',
                background: action.variant === 'danger' ? 'var(--maw-danger)' : action.variant === 'primary' ? 'var(--maw-brand)' : 'transparent',
                color: action.variant && action.variant !== 'default' ? 'var(--maw-brandContrast)' : 'var(--maw-fg)',
                fontSize: 'var(--maw-text-xs)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {action.icon}{action.icon ? ' ' : ''}{action.label}
            </button>
          );
        })}
      </div>
      {confirmAction?.confirm && (
        <ConfirmationDialog
          open={true}
          title={confirmAction.confirm.title}
          message={confirmAction.confirm.message}
          confirmLabel={confirmAction.confirm.confirmLabel}
          variant={confirmAction.confirm.variant ?? 'primary'}
          onConfirm={() => { confirmAction.handler(selectedRows); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

function DataGridExportButton({
  formats,
  onExport,
  hasPermission,
}: {
  readonly formats: readonly ExportFormatValue[];
  readonly onExport: (format: ExportFormatValue) => void;
  readonly hasPermission: boolean;
}): ReactNode {
  if (!hasPermission) return null;

  const firstFormat = formats[0];
  if (formats.length === 1 && firstFormat) {
    return (
      <button
        onClick={() => onExport(firstFormat)}
        style={{
          ...base,
          padding: '4px 12px',
          borderRadius: 'var(--maw-radius-sm)',
          border: '1px solid var(--maw-border)',
          background: 'transparent',
          color: 'var(--maw-fg)',
          fontSize: 'var(--maw-text-xs)',
          cursor: 'pointer',
        }}
      >Export {firstFormat.toUpperCase()}</button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--maw-space-xs)' }}>
      {formats.map((f) => (
        <button
          key={f}
          onClick={() => onExport(f)}
          style={{
            ...base,
            padding: '4px 12px',
            borderRadius: 'var(--maw-radius-sm)',
            border: '1px solid var(--maw-border)',
            background: 'transparent',
            color: 'var(--maw-fg)',
            fontSize: 'var(--maw-text-xs)',
            cursor: 'pointer',
          }}
        >{f.toUpperCase()}</button>
      ))}
    </div>
  );
}

function DataGridTable<T extends object>({
  schema,
  engine,
}: {
  readonly schema: DataGridSchema<T>;
  readonly engine: UseDataGridReturn<T>;
}): ReactNode {
  const { visibleColumns, data, sort, selectedKeys, expandedKeys, loading } = engine;
  const selectable = schema.selection?.enabled;
  const hasRowActions = schema.rowActions && schema.rowActions.length > 0;
  const hasExpansion = schema.expansion?.enabled;
  const compact = schema.compact;
  const cellPadding = compact ? '6px 10px' : '10px 14px';
  const totalCols = visibleColumns.length + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0) + (hasExpansion ? 1 : 0);

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--maw-border)', borderRadius: 'var(--maw-radius-lg)', background: 'var(--maw-surface)' }}>
      <table
        role="grid"
        aria-busy={loading}
        style={{
          ...base,
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--maw-text-sm)',
          color: 'var(--maw-fg)',
          border: schema.bordered ? '1px solid var(--maw-border)' : undefined,
        }}
      >
        <thead>
          <tr>
            {hasExpansion && (
              <th style={{ ...thStyle(cellPadding, schema.stickyHeader), width: 36 }} />
            )}
            {selectable && (
              <th style={{ ...thStyle(cellPadding, schema.stickyHeader), width: 40, textAlign: 'center' }}>
                <Checkbox label="" checked={engine.isAllSelected} onChange={() => engine.isAllSelected ? engine.deselectAll() : engine.selectAll()} />
              </th>
            )}
            {visibleColumns.map((col) => (
              <th
                key={col.id}
                onClick={col.sortable ? () => engine.onSort(col.field ?? col.id) : undefined}
                style={{
                  ...thStyle(cellPadding, schema.stickyHeader),
                  textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
                  width: col.width,
                  minWidth: col.minWidth,
                  maxWidth: col.maxWidth,
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: col.sortable ? 'none' : undefined,
                }}
              >
                {col.headerRender ? col.headerRender() : col.header}
                {col.sortable && sort?.field === (col.field ?? col.id) && (
                  <span style={{ marginLeft: 4 }}>{sort.direction === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
            {hasRowActions && (
              <th style={{ ...thStyle(cellPadding, schema.stickyHeader), width: 60 }} />
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && !loading && (
            <tr>
              <td colSpan={totalCols} style={{ padding: 'var(--maw-space-xxl)', textAlign: 'center', color: 'var(--maw-fgMuted)' }}>
                <DataGridEmpty config={schema.empty} />
              </td>
            </tr>
          )}
          {data.map((row, idx) => {
            const key = String((row as Record<string, unknown>)[schema.keyField]);
            const isSelected = selectedKeys.has(key);
            const isExpanded = expandedKeys.has(key);
            return (
              <DataGridRow
                key={key}
                row={row}
                rowKey={key}
                index={idx}
                columns={visibleColumns}
                schema={schema}
                engine={engine}
                isSelected={isSelected}
                isExpanded={isExpanded}
                cellPadding={cellPadding}
                totalCols={totalCols}
              />
            );
          })}
        </tbody>
      </table>

      {loading && (
        <Stack direction="column" align="center" style={{ padding: 'var(--maw-space-lg)' }}>
          <Spinner size={24} />
        </Stack>
      )}
    </div>
  );
}

function DataGridRow<T extends object>({
  row,
  rowKey,
  index,
  columns,
  schema,
  engine,
  isSelected,
  isExpanded,
  cellPadding,
  totalCols,
}: {
  readonly row: T;
  readonly rowKey: string;
  readonly index: number;
  readonly columns: readonly DataGridColumn<T>[];
  readonly schema: DataGridSchema<T>;
  readonly engine: UseDataGridReturn<T>;
  readonly isSelected: boolean;
  readonly isExpanded: boolean;
  readonly cellPadding: string;
  readonly totalCols: number;
}): ReactNode {
  const selectable = schema.selection?.enabled;
  const hasRowActions = schema.rowActions && schema.rowActions.length > 0;
  const hasExpansion = schema.expansion?.enabled;

  const rowStyle: CSSProperties = {
    cursor: schema.onRowClick ? 'pointer' : undefined,
    background: isSelected ? 'var(--maw-bgSubtle)' : undefined,
    borderBottom: '1px solid var(--maw-border)',
  };

  if (schema.striped && index % 2 === 1) {
    rowStyle.background = isSelected ? 'var(--maw-bgSubtle)' : 'var(--maw-bgMuted)';
  }

  const customClass = schema.getRowClassName?.(row, index);

  return (
    <>
      <tr
        onClick={schema.onRowClick ? () => schema.onRowClick!(row) : undefined}
        style={rowStyle}
        className={`maw-table-row-hover ${customClass ?? ''}`.trim()}
        data-selected={isSelected || undefined}
      >
        {hasExpansion && (
          <td style={{ padding: cellPadding, textAlign: 'center' }}>
            <button
              onClick={(e) => { e.stopPropagation(); engine.toggleExpanded(rowKey); }}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
              style={{
                ...base,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--maw-fgMuted)',
                fontSize: 'var(--maw-text-xs)',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                padding: 2,
              }}
            >▶</button>
          </td>
        )}
        {selectable && (
          <td style={{ padding: cellPadding, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Checkbox
              label=""
              checked={isSelected}
              onChange={() => {
                const next = new Set(engine.selectedKeys);
                if (next.has(rowKey)) next.delete(rowKey);
                else next.add(rowKey);
                engine.onSelectionChange(next);
              }}
            />
          </td>
        )}
        {columns.map((col) => (
          <td
            key={col.id}
            style={{
              padding: cellPadding,
              textAlign: (col.align ?? 'left') as CSSProperties['textAlign'],
            }}
          >
            {renderCell(col, row, index)}
          </td>
        ))}
        {hasRowActions && (
          <td style={{ padding: cellPadding, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
            <DataGridRowActions
              actions={schema.rowActions!}
              row={row}
              hasPermission={engine.hasPermission}
            />
          </td>
        )}
      </tr>
      {hasExpansion && isExpanded && schema.expansion && (
        <tr>
          <td colSpan={totalCols} style={{ padding: cellPadding, background: 'var(--maw-bgMuted)', borderBottom: '1px solid var(--maw-border)' }}>
            {schema.expansion.render(row)}
          </td>
        </tr>
      )}
    </>
  );
}

function DataGridRowActions<T extends object>({
  actions,
  row,
  hasPermission,
}: {
  readonly actions: readonly DataGridRowAction<T>[];
  readonly row: T;
  readonly hasPermission: (code: string) => boolean;
}): ReactNode {
  const [confirmAction, setConfirmAction] = useState<DataGridRowAction<T> | null>(null);

  const visibleActions = actions.filter((a) => {
    if (a.permission && !hasPermission(a.permission)) return false;
    if (typeof a.hidden === 'function') return !a.hidden(row);
    return !a.hidden;
  });

  if (visibleActions.length === 0) return null;

  return (
    <>
      <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {visibleActions.map((action) => {
          const disabled = typeof action.disabled === 'function' ? action.disabled(row) : action.disabled;
          return (
            <button
              key={action.id}
              disabled={disabled}
              onClick={() => action.confirm ? setConfirmAction(action) : action.handler(row)}
              title={action.label}
              style={{
                ...base,
                padding: '4px 8px',
                borderRadius: 'var(--maw-radius-sm)',
                border: 'none',
                background: 'transparent',
                color: action.variant === 'danger' ? 'var(--maw-danger)' : 'var(--maw-fgMuted)',
                fontSize: 'var(--maw-text-xs)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              {action.icon ?? action.label}
            </button>
          );
        })}
      </div>
      {confirmAction?.confirm && (
        <ConfirmationDialog
          open={true}
          title={confirmAction.confirm.title}
          message={confirmAction.confirm.message}
          confirmLabel={confirmAction.confirm.confirmLabel}
          variant={confirmAction.confirm.variant ?? 'primary'}
          onConfirm={() => { confirmAction.handler(row); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  );
}

function DataGridCards<T extends object>({
  schema,
  engine,
}: {
  readonly schema: DataGridSchema<T>;
  readonly engine: UseDataGridReturn<T>;
}): ReactNode {
  const { visibleColumns, data, loading } = engine;
  const mobileColumns = schema.responsive?.mobileColumns;
  const cols = mobileColumns
    ? visibleColumns.filter((c) => mobileColumns.includes(c.id))
    : visibleColumns.slice(0, 4);

  if (data.length === 0 && !loading) {
    return <DataGridEmpty config={schema.empty} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--maw-space-sm)' }}>
      {data.map((row) => {
        const key = String((row as Record<string, unknown>)[schema.keyField]);
        return (
          <div
            key={key}
            onClick={schema.onRowClick ? () => schema.onRowClick!(row) : undefined}
            style={{
              ...base,
              padding: 'var(--maw-space-md)',
              border: '1px solid var(--maw-border)',
              borderRadius: 'var(--maw-radius-md)',
              background: 'var(--maw-bg)',
              cursor: schema.onRowClick ? 'pointer' : undefined,
            }}
          >
            {cols.map((col) => (
              <div key={col.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', fontWeight: 600 }}>{col.header}</span>
                <span style={{ fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)' }}>
                  {renderCell(col, row, 0)}
                </span>
              </div>
            ))}
          </div>
        );
      })}
      {loading && (
        <Stack direction="column" align="center" style={{ padding: 'var(--maw-space-lg)' }}>
          <Spinner size={24} />
        </Stack>
      )}
    </div>
  );
}

function DataGridPagination({
  config,
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  readonly config?: import('@mawsoftwares/sdk').DataGridPaginationConfig;
  readonly pagination: DataGridPaginationState;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: number) => void;
}): ReactNode {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  if (totalPages <= 0) return null;

  const pageSizeOptions = config?.pageSizeOptions ?? [10, 25, 50, 100];
  const showPageSizeSelector = config?.showPageSizeSelector !== false;
  const showTotalCount = config?.showTotalCount !== false;

  return (
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
      {showPageSizeSelector && (
        <Stack direction="row" align="center" gap="8px">
          <span>Rows per page:</span>
          <Select
            options={pageSizeOptions.map((s) => ({ value: String(s), label: String(s) }))}
            value={String(pagination.pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{ width: 64, fontSize: 'var(--maw-text-xs)', padding: '2px 4px' }}
          />
        </Stack>
      )}
      {showTotalCount && (
        <div>
          {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
        </div>
      )}
      <Stack direction="row" gap="4px">
        <IconButton label="Previous page" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>←</IconButton>
        <IconButton label="Next page" disabled={pagination.page >= totalPages} onClick={() => onPageChange(pagination.page + 1)}>→</IconButton>
      </Stack>
    </Stack>
  );
}

function DataGridEmpty({
  config,
}: {
  readonly config?: import('@mawsoftwares/sdk').DataGridEmptyConfig;
}): ReactNode {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)', color: 'var(--maw-fgMuted)' }}>
      {config?.icon && <div style={{ marginBottom: 'var(--maw-space-sm)', fontSize: 32 }}>{config.icon}</div>}
      {config?.title && <div style={{ ...base, fontSize: 'var(--maw-text-md)', fontWeight: 600, marginBottom: 'var(--maw-space-xs)' }}>{config.title}</div>}
      <div style={{ ...base, fontSize: 'var(--maw-text-sm)' }}>{config?.message ?? 'No data'}</div>
      {config?.action && <div style={{ marginTop: 'var(--maw-space-md)' }}>{config.action}</div>}
    </div>
  );
}

function DataGridError({
  schema,
  onRetry,
}: {
  readonly schema: DataGridSchema<Record<string, unknown>>;
  readonly onRetry: () => void;
}): ReactNode {
  const errorConfig = schema.error;
  return (
    <div style={{ textAlign: 'center', padding: 'var(--maw-space-xxl)', color: 'var(--maw-danger)' }}>
      <div style={{ ...base, fontSize: 'var(--maw-text-md)', fontWeight: 600, marginBottom: 'var(--maw-space-xs)' }}>
        {errorConfig?.title ?? 'Failed to load data'}
      </div>
      <div style={{ ...base, fontSize: 'var(--maw-text-sm)', marginBottom: 'var(--maw-space-md)' }}>
        {errorConfig?.message ?? 'An error occurred while fetching data.'}
      </div>
      <button
        onClick={onRetry}
        style={{
          ...base,
          padding: 'var(--maw-space-sm) var(--maw-space-lg)',
          borderRadius: 'var(--maw-radius-md)',
          border: 'none',
          background: 'var(--maw-brand)',
          color: 'var(--maw-brandContrast)',
          cursor: 'pointer',
          fontSize: 'var(--maw-text-sm)',
        }}
      >Retry</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function thStyle(padding: string, sticky?: boolean): CSSProperties {
  return {
    ...base,
    padding,
    fontWeight: 600,
    fontSize: 'var(--maw-text-xs)',
    color: 'var(--maw-fgMuted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--maw-border)',
    background: 'var(--maw-bgMuted)',
    whiteSpace: 'nowrap',
    position: sticky ? 'sticky' : undefined,
    top: sticky ? 0 : undefined,
  };
}

function renderCell<T>(col: DataGridColumn<T>, row: T, index: number): ReactNode {
  if (col.render) return col.render(row, index);
  if (!col.field) return null;
  const val = (row as Record<string, unknown>)[col.field];
  if (col.formatter) return col.formatter(val, row);
  return val as ReactNode;
}
