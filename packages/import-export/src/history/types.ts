import type { ImportExportRecord } from '../types';

export interface IImportExportHistory {
  create(record: ImportExportRecord): Promise<void>;
  get(id: string): Promise<ImportExportRecord | null>;
  update(id: string, updates: Partial<ImportExportRecord>): Promise<void>;
  list(tenantId: string, type?: 'IMPORT' | 'EXPORT', limit?: number): Promise<readonly ImportExportRecord[]>;
  delete(id: string): Promise<void>;
}
