import type { DateRangeRequest } from '../date-range/types';
import type { FilterGroup } from '../filters/types';
import type { SortField } from '../sorting/types';
import type { GroupingRequest } from '../grouping/types';
import type { AggregationRequest, AggregationResult } from '../aggregation/types';
import type { PaginationRequest } from '../pagination/types';

export interface ReportRequest {
  readonly definitionName: string;
  readonly dateRange?: DateRangeRequest;
  readonly filters?: FilterGroup;
  readonly sorting?: readonly SortField[];
  readonly grouping?: GroupingRequest;
  readonly aggregations?: readonly AggregationRequest[];
  readonly pagination?: PaginationRequest;
  readonly parameters?: Record<string, unknown>;
}

export interface ReportResult {
  readonly reportId: string;
  readonly definitionName: string;
  readonly rows: readonly Record<string, unknown>[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly aggregations?: readonly AggregationResult[];
  readonly summary?: readonly AggregationResult[];
  readonly executionTimeMs: number;
  readonly generatedAt: string;
}

export interface ReportPreviewResult extends ReportResult {
  readonly isPreview: true;
}
