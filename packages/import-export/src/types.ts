import type { ID } from '@maw/sdk';
import type { Validator } from '@maw/sdk';

export const ImportStatus = {
  UPLOADED: 'UPLOADED',
  PARSING: 'PARSING',
  PREVIEW_READY: 'PREVIEW_READY',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  COMPLETED_WITH_ERRORS: 'COMPLETED_WITH_ERRORS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type ImportStatusValue = (typeof ImportStatus)[keyof typeof ImportStatus];

export const ExportStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type ExportStatusValue = (typeof ExportStatus)[keyof typeof ExportStatus];

export const ImportFormat = {
  CSV: 'CSV',
  EXCEL: 'EXCEL',
  JSON: 'JSON',
} as const;

export type ImportFormatValue = (typeof ImportFormat)[keyof typeof ImportFormat];

export const ExportFormat = {
  CSV: 'CSV',
  EXCEL: 'EXCEL',
  JSON: 'JSON',
  PDF: 'PDF',
} as const;

export type ExportFormatValue = (typeof ExportFormat)[keyof typeof ExportFormat];

export const FieldType = {
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  DECIMAL: 'decimal',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATETIME: 'datetime',
  EMAIL: 'email',
  PHONE: 'phone',
  URL: 'url',
  ENUM: 'enum',
} as const;

export type FieldTypeValue = (typeof FieldType)[keyof typeof FieldType];

export const DuplicateStrategy = {
  REJECT: 'REJECT',
  SKIP: 'SKIP',
  UPDATE: 'UPDATE',
  UPSERT: 'UPSERT',
} as const;

export type DuplicateStrategyValue = (typeof DuplicateStrategy)[keyof typeof DuplicateStrategy];

export const ErrorSeverity = {
  ERROR: 'ERROR',
  WARNING: 'WARNING',
} as const;

export type ErrorSeverityValue = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

export interface OperationContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly correlationId?: string;
}

export interface FieldDefinition {
  readonly name: string;
  readonly label: string;
  readonly type: FieldTypeValue;
  readonly required?: boolean;
  readonly aliases?: readonly string[];
  readonly defaultValue?: unknown;
  readonly transform?: (value: unknown) => unknown;
  readonly validators?: readonly Validator[];
  readonly enumValues?: readonly string[];
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
}

export interface ImportDefinition<T = Record<string, unknown>> {
  readonly name: string;
  readonly fields: readonly FieldDefinition[];
  readonly duplicateKeys?: readonly string[];
  readonly duplicateStrategy?: DuplicateStrategyValue;
  readonly chunkSize?: number;
  readonly maxFileSize?: number;
  readonly allowedFormats?: readonly ImportFormatValue[];
  readonly maxPreviewRows?: number;
  readonly crossFieldValidator?: (row: Record<string, unknown>) => RowError[];
}

export interface ExportFieldDefinition {
  readonly name: string;
  readonly label: string;
  readonly transform?: (value: unknown) => unknown;
  readonly format?: string;
}

export interface ExportDefinition<T = Record<string, unknown>> {
  readonly name: string;
  readonly fields: readonly ExportFieldDefinition[];
  readonly format: ExportFormatValue;
  readonly filters?: Record<string, unknown>;
  readonly sorting?: readonly { field: string; direction: 'asc' | 'desc' }[];
  readonly chunkSize?: number;
  readonly fileName?: string;
}

export interface RowError {
  readonly rowNumber: number;
  readonly column?: string;
  readonly field?: string;
  readonly value?: string;
  readonly errorCode: string;
  readonly message: string;
  readonly severity: ErrorSeverityValue;
}

export interface ImportProgress {
  readonly totalRows: number;
  readonly processedRows: number;
  readonly successfulRows: number;
  readonly failedRows: number;
  readonly duplicateRows: number;
  readonly skippedRows: number;
  readonly percentage: number;
}

export interface ExportProgress {
  readonly totalRows: number;
  readonly processedRows: number;
  readonly percentage: number;
}

export interface ImportPreview {
  readonly totalRows: number;
  readonly validRows: number;
  readonly invalidRows: number;
  readonly duplicateRows: number;
  readonly sampleRows: readonly Record<string, unknown>[];
  readonly mapping: ReadonlyMap<string, string>;
  readonly unmappedColumns: readonly string[];
  readonly missingRequiredFields: readonly string[];
  readonly errors: readonly RowError[];
  readonly warnings: readonly string[];
}

export interface ImportExportRecord {
  readonly id: ID;
  readonly tenantId: string;
  readonly userId: string;
  readonly type: 'IMPORT' | 'EXPORT';
  readonly format: ImportFormatValue | ExportFormatValue;
  readonly fileName: string;
  readonly status: ImportStatusValue | ExportStatusValue;
  readonly definitionName: string;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly progress?: ImportProgress | ExportProgress;
  readonly fileRef?: string;
  readonly errorReportRef?: string;
  readonly error?: string;
}

export interface BatchProcessResult {
  readonly successful: number;
  readonly failed: number;
  readonly errors: readonly RowError[];
}
