import type { OperationContext } from '../types';
import type { FilterGroup } from '../filters/types';
import type { SortField } from '../sorting/types';
import type { PaginationRequest } from '../pagination/types';
import type { AggregationRequest, AggregationResult } from '../aggregation/types';
import type { GroupingRequest } from '../grouping/types';

export interface ReportQuery {
  readonly filters?: FilterGroup;
  readonly sorting?: readonly SortField[];
  readonly pagination: PaginationRequest;
}

export interface AggregateQuery {
  readonly filters?: FilterGroup;
  readonly aggregations: readonly AggregationRequest[];
  readonly grouping?: GroupingRequest;
}

export interface IReportDataSource<TRow = Record<string, unknown>> {
  count(filters: FilterGroup | undefined, context: OperationContext): Promise<number>;
  fetchRows(query: ReportQuery, context: OperationContext): Promise<readonly TRow[]>;
  fetchAggregates(query: AggregateQuery, context: OperationContext): Promise<readonly AggregationResult[]>;
  availableFields(): readonly string[];
}
