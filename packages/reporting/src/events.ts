export const ReportEvent = {
  REPORT_CREATED: 'report.created',
  REPORT_VALIDATED: 'report.validated',
  REPORT_QUEUED: 'report.queued',
  REPORT_STARTED: 'report.started',
  REPORT_PROGRESS: 'report.progress',
  REPORT_COMPLETED: 'report.completed',
  REPORT_FAILED: 'report.failed',
  REPORT_CANCELLED: 'report.cancelled',
  REPORT_EXPORTED: 'report.exported',
} as const;

export interface ReportEventPayload {
  readonly reportId: string;
  readonly tenantId: string;
  readonly definitionName: string;
}

export interface ReportProgressPayload extends ReportEventPayload {
  readonly processedRows: number;
  readonly totalRows: number;
  readonly percentage: number;
}
