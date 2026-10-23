import { useCallback, useMemo, type ReactNode } from 'react';
import type { ColumnDef, DataTableProps as ContractDataTableProps } from '@mawsoftwares/ui-contract';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/cn';
import { useIsMobile } from '../lib/use-is-mobile';
import { Card } from './Card';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';
import { SkeletonRows } from './Skeleton';
import { Select } from './Select';
import { Spinner } from './Spinner';

export type {
  ColumnDef,
  PaginationState,
  SortDirection,
  SortState,
} from '@mawsoftwares/ui-contract';

export type DataTableProps<T> = ContractDataTableProps<T> & { readonly className?: string };

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

/**
 * Same props as the `DataTable` in @mawsoftwares/ui-web. The table is fully controlled (the parent owns
 * sort / page / selection state — see `useDataTable` in ui-web), so this is a presentation re-skin and
 * needs no table engine. Below `md` it renders stacked cards, like ui-web.
 */
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
  responsive = true,
  style,
  className,
}: DataTableProps<T>): ReactNode {
  const isMobile = useIsMobile();
  const cell = compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5';
  const colSpan = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  const handleSort = useCallback(
    (col: string) => {
      if (!onSort) return;
      onSort({ column: col, direction: sort?.column === col && sort.direction === 'asc' ? 'desc' : 'asc' });
    },
    [sort, onSort],
  );

  const allSelected = useMemo(() => {
    if (!selectable || !selectedKeys || data.length === 0) return false;
    return data.every((row) => selectedKeys.has(String(row[keyField])));
  }, [data, keyField, selectable, selectedKeys]);

  const toggleAll = useCallback(() => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(data.map((row) => String(row[keyField]))));
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
  const cellValue = (row: T, col: ColumnDef<T>, idx: number): ReactNode =>
    col.render ? col.render(row, idx) : ((row as Record<string, unknown>)[col.key] as ReactNode);

  const mobileCards = (): ReactNode => {
    if (loading && data.length === 0) {
      return (
        <div className="p-4">
          <SkeletonRows rows={4} columns={1} />
        </div>
      );
    }
    if (data.length === 0) {
      return <div className="p-6 text-center text-fg-muted">{emptyMessage}</div>;
    }
    return (
      <div className="flex flex-col gap-4 p-4">
        {selectable && <Checkbox label="Select All" checked={allSelected} onChange={toggleAll} />}
        {data.map((row, idx) => {
          const key = String(row[keyField]);
          const isSelected = selectedKeys?.has(key) ?? false;
          return (
            <Card
              key={key}
              variant="bordered"
              padding="var(--maw-space-md)"
              className={cn(isSelected && 'border-brand bg-bg-subtle', onRowClick && 'cursor-pointer')}
            >
              <div onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {selectable && (
                  <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox label="Select" checked={isSelected} onChange={() => toggleRow(key)} />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-start justify-between">
                      <span className="w-[35%] shrink-0 text-xs text-fg-muted">{col.header}</span>
                      <span className="flex-1 break-words text-right text-sm text-fg">{cellValue(row, col, idx)}</span>
                    </div>
                  ))}
                </div>
                {rowActions !== undefined && (
                  <div
                    className="mt-4 flex justify-end border-t border-border pt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rowActions(row)}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const headCell = cn(
    'whitespace-nowrap border-b border-[var(--maw-comp-tables-border-color,var(--maw-border))] bg-[var(--maw-comp-tables-header-background,var(--maw-bgMuted))] text-xs font-bold uppercase tracking-wider text-[var(--maw-comp-tables-header-text-color,var(--maw-fgMuted))]',
    cell,
    stickyHeader && 'sticky top-0 z-[1]',
  );

  return (
    <div
      style={style}
      className={cn(
        'box-border overflow-hidden border border-[var(--maw-comp-tables-border-color,var(--maw-border))] bg-[var(--maw-comp-tables-row-background,var(--maw-surface))] font-sans rounded-[var(--maw-comp-tables-border-radius,var(--maw-radius-lg))]',
        className,
      )}
    >
      {responsive && isMobile ? (
        mobileCards()
      ) : (
        <div className="overflow-x-auto bg-bg">
          <table className="w-full border-collapse text-sm text-fg">
            <thead>
              <tr>
                {selectable && (
                  <th className={cn(headCell, 'w-10 text-center')}>
                    <Checkbox label="" checked={allSelected} onChange={toggleAll} />
                  </th>
                )}
                {columns.map((col) => {
                  const active = sort?.column === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width }}
                      aria-sort={col.sortable ? (active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                      className={cn(headCell, ALIGN[col.align ?? 'left'])}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="inline-flex cursor-pointer select-none items-center gap-1 rounded-sm font-[inherit] uppercase tracking-[inherit] text-inherit transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          {col.header}
                          {active &&
                            (sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
                {rowActions !== undefined && <th className={cn(headCell, 'w-[60px]')} />}
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="p-4">
                    <SkeletonRows rows={5} columns={columns.length} />
                  </td>
                </tr>
              )}
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={colSpan} className="p-8 text-center text-fg-muted">
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
                    aria-selected={selectable ? isSelected : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-[var(--maw-comp-tables-border-color,var(--maw-border))] transition-colors last:border-b-0',
                      isSelected
                        ? 'bg-[var(--maw-comp-tables-row-selected-background,var(--maw-bgSubtle))]'
                        : 'bg-[var(--maw-comp-tables-row-background,var(--maw-surface))] hover:bg-bg-subtle',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {selectable && (
                      <td className={cn(cell, 'text-center')} onClick={(e) => e.stopPropagation()}>
                        <Checkbox label="" checked={isSelected} onChange={() => toggleRow(key)} />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn(cell, ALIGN[col.align ?? 'left'])}>
                        {cellValue(row, col, idx)}
                      </td>
                    ))}
                    {rowActions !== undefined && (
                      <td className={cn(cell, 'text-right')} onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination !== undefined && totalPages > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--maw-comp-tables-border-color,var(--maw-border))] bg-[var(--maw-comp-pagination-background,transparent)] px-4 py-2 text-xs text-[var(--maw-comp-pagination-text-color,var(--maw-fgMuted))]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <div className="w-20 [&_label]:mb-0 [&_select]:py-1 [&_select]:text-xs">
              <Select
                options={pageSizeOptions.map((s) => ({ value: String(s), label: String(s) }))}
                value={String(pagination.pageSize)}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                aria-label="Rows per page"
              />
            </div>
          </div>
          <div>
            {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </div>
          <div className="flex gap-1">
            <IconButton
              label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
            </IconButton>
            <IconButton
              label="Next page"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              <ChevronRight className="size-4" />
            </IconButton>
          </div>
        </div>
      )}

      {loading && data.length > 0 && (
        <div className="flex justify-center p-4">
          <Spinner size={24} />
        </div>
      )}
    </div>
  );
}
