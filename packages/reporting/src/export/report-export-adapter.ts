import type { IExportDataProvider, OperationContext } from '@mawsoftwares/import-export';
import type { IReportDataSource } from '../datasource/types';
import type { FilterGroup } from '../filters/types';
import type { SortField } from '../sorting/types';
import type { ComputedColumnDefinition } from '../definition/types';
import { resolveComputedColumns } from '../columns/resolver';

export class ReportExportAdapter implements IExportDataProvider<Record<string, unknown>> {
  constructor(
    private readonly datasource: IReportDataSource,
    private readonly filters: FilterGroup | undefined,
    private readonly sorting: readonly SortField[] | undefined,
    private readonly computedColumns: readonly ComputedColumnDefinition[],
  ) {}

  async count(
    _filters: Record<string, unknown>,
    context: OperationContext,
  ): Promise<number> {
    return this.datasource.count(this.filters, context);
  }

  async fetch(
    _filters: Record<string, unknown>,
    offset: number,
    limit: number,
    context: OperationContext,
  ): Promise<readonly Record<string, unknown>[]> {
    const page = Math.floor(offset / limit) + 1;
    const rows = await this.datasource.fetchRows(
      {
        filters: this.filters,
        sorting: this.sorting,
        pagination: { page, pageSize: limit },
      },
      context,
    );
    return resolveComputedColumns(rows as Record<string, unknown>[], this.computedColumns);
  }
}
