export const ReportStatus = {
  PENDING: 'PENDING',
  VALIDATING: 'VALIDATING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type ReportStatusValue = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ColumnType = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  CURRENCY: 'currency',
  PERCENTAGE: 'percentage',
  DATE: 'date',
  DATETIME: 'datetime',
  BOOLEAN: 'boolean',
  ENUM: 'enum',
} as const;

export type ColumnTypeValue = (typeof ColumnType)[keyof typeof ColumnType];

export const AggregationType = {
  COUNT: 'COUNT',
  SUM: 'SUM',
  AVG: 'AVG',
  MIN: 'MIN',
  MAX: 'MAX',
} as const;

export type AggregationTypeValue = (typeof AggregationType)[keyof typeof AggregationType];

export const DateRangePreset = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  THIS_WEEK: 'THIS_WEEK',
  LAST_WEEK: 'LAST_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_QUARTER: 'THIS_QUARTER',
  LAST_QUARTER: 'LAST_QUARTER',
  THIS_YEAR: 'THIS_YEAR',
  LAST_YEAR: 'LAST_YEAR',
  CUSTOM: 'CUSTOM',
} as const;

export type DateRangePresetValue = (typeof DateRangePreset)[keyof typeof DateRangePreset];

export type SortDirection = 'asc' | 'desc';

export interface OperationContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly correlationId?: string;
}
