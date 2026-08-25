import type { ReportStatusValue } from '../types';

export interface ReportProgress {
  readonly totalRows: number;
  readonly processedRows: number;
  readonly percentage: number;
}

export interface ReportRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly definitionName: string;
  readonly status: ReportStatusValue;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly progress?: ReportProgress;
  readonly fileRef?: string;
  readonly error?: string;
  readonly rowCount?: number;
  readonly executionTimeMs?: number;
}

export interface IReportHistory {
  create(record: ReportRecord): Promise<void>;
  get(id: string): Promise<ReportRecord | null>;
  update(id: string, updates: Partial<ReportRecord>): Promise<void>;
  list(tenantId: string, limit?: number): Promise<readonly ReportRecord[]>;
  listByDefinition(tenantId: string, definitionName: string, limit?: number): Promise<readonly ReportRecord[]>;
  delete(id: string): Promise<void>;
}
