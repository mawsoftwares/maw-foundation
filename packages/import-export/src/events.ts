export const ImportExportEvent = {
  IMPORT_CREATED: 'import.created',
  IMPORT_PARSING: 'import.parsing',
  IMPORT_PREVIEW_READY: 'import.preview_ready',
  IMPORT_STARTED: 'import.started',
  IMPORT_PROGRESS: 'import.progress',
  IMPORT_COMPLETED: 'import.completed',
  IMPORT_FAILED: 'import.failed',
  IMPORT_CANCELLED: 'import.cancelled',

  EXPORT_CREATED: 'export.created',
  EXPORT_STARTED: 'export.started',
  EXPORT_PROGRESS: 'export.progress',
  EXPORT_COMPLETED: 'export.completed',
  EXPORT_FAILED: 'export.failed',
  EXPORT_CANCELLED: 'export.cancelled',
} as const;

export interface ImportEventPayload {
  readonly importId: string;
  readonly tenantId: string;
  readonly definitionName: string;
}

export interface ImportProgressPayload extends ImportEventPayload {
  readonly processedRows: number;
  readonly totalRows: number;
  readonly percentage: number;
}

export interface ExportEventPayload {
  readonly exportId: string;
  readonly tenantId: string;
  readonly definitionName: string;
}

export interface ExportProgressPayload extends ExportEventPayload {
  readonly processedRows: number;
  readonly totalRows: number;
  readonly percentage: number;
}
