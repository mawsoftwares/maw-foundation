import type { DateRangeRequest } from '../date-range/types';
import type { FilterGroup } from '../filters/types';
import type { SortField } from '../sorting/types';
import type { GroupingRequest } from '../grouping/types';
import type { AggregationRequest } from '../aggregation/types';

export interface SavedReportRequest {
  readonly dateRange?: DateRangeRequest;
  readonly filters?: FilterGroup;
  readonly sorting?: readonly SortField[];
  readonly grouping?: GroupingRequest;
  readonly aggregations?: readonly AggregationRequest[];
  readonly parameters?: Record<string, unknown>;
}

export interface SavedReport {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly name: string;
  readonly description?: string;
  readonly definitionName: string;
  readonly request: SavedReportRequest;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isDefault?: boolean;
  readonly schedule?: string;
}

export interface ISavedReportStore {
  save(report: SavedReport): Promise<void>;
  get(id: string): Promise<SavedReport | null>;
  update(id: string, updates: Partial<SavedReport>): Promise<void>;
  list(tenantId: string, definitionName?: string): Promise<readonly SavedReport[]>;
  listByUser(tenantId: string, userId: string, definitionName?: string): Promise<readonly SavedReport[]>;
  delete(id: string): Promise<void>;
}
