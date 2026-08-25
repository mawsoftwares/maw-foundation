// Core types and enums
export {
  ReportStatus,
  type ReportStatusValue,
  ColumnType,
  type ColumnTypeValue,
  AggregationType,
  type AggregationTypeValue,
  DateRangePreset,
  type DateRangePresetValue,
  type SortDirection,
  type OperationContext,
} from './types';

// Errors
export {
  ReportErrorCode,
  ReportError,
  ReportValidationError,
  ReportAuthorizationError,
  ReportNotFoundError,
  InvalidFilterError,
  InvalidColumnError,
  InvalidSortError,
  ReportStateTransitionError,
  DataSourceError,
} from './errors';

// Events
export {
  ReportEvent,
  type ReportEventPayload,
  type ReportProgressPayload,
} from './events';

// State machine
export { validateTransition, canTransition } from './state-machine';

// Definition
export {
  type ReportDefinition,
  type ReportColumnDefinition,
  type ComputedColumnDefinition,
  type ComputedColumnExpression,
  type AggregationDefinition,
  isComputedColumn,
} from './definition/types';
export { validateReportDefinition } from './definition/validation';
export {
  extractMetadata,
  type ReportMetadata,
  type FilterableFieldInfo,
  type AggregatableFieldInfo,
} from './definition/metadata';

// Filters
export {
  type FilterCondition,
  type FilterGroup,
  type FilterLogic,
  isFilterGroup,
} from './filters/types';
export { FilterBuilder } from './filters/builder';
export { validateFilters, operatorsForType } from './filters/validation';

// Date range
export { type DateRange, type DateRangeRequest } from './date-range/types';
export { resolveDateRange } from './date-range/resolver';

// Sorting
export { type SortField } from './sorting/types';
export { validateSorting } from './sorting/validation';

// Grouping
export { type GroupingRequest, type GroupedRow } from './grouping/types';

// Aggregation
export { type AggregationRequest, type AggregationResult } from './aggregation/types';

// Pagination
export { type PaginationRequest, type PaginatedResult } from './pagination/types';

// Columns
export { resolveComputedColumns } from './columns/resolver';

// Datasource
export {
  type IReportDataSource,
  type ReportQuery,
  type AggregateQuery,
} from './datasource/types';

// Execution
export {
  type ReportRequest,
  type ReportResult,
  type ReportPreviewResult,
} from './execution/types';
export {
  type IReportDefinitionRegistry,
  type IReportDataSourceRegistry,
  ReportDefinitionRegistry,
  ReportDataSourceRegistry,
} from './execution/registries';
export { ReportExecutor, type ReportExecutorOptions } from './execution/report-executor';
export {
  createReportWorker,
  REPORT_JOB_TYPE,
  type ReportJobData,
} from './execution/report-worker';

// Export integration
export { ReportExportAdapter } from './export/report-export-adapter';
export { toExportDefinition, getVisibleColumns } from './export/definition-mapper';

// History
export {
  type ReportRecord,
  type ReportProgress,
  type IReportHistory,
} from './history/types';
export { InMemoryReportHistory } from './history/memory-store';

// Saved reports
export {
  type SavedReport,
  type SavedReportRequest,
  type ISavedReportStore,
} from './saved/types';
export { InMemorySavedReportStore } from './saved/memory-store';

// Service
export { ReportService, type ReportServiceOptions } from './service/report-service';
export { validateReportRequest } from './service/validation';
