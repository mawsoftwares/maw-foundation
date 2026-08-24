import type { ImportExportRecord } from '../types';
import type { IImportExportHistory } from './types';

export class InMemoryHistoryStore implements IImportExportHistory {
  private readonly records = new Map<string, ImportExportRecord>();

  async create(record: ImportExportRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<ImportExportRecord | null> {
    return this.records.get(id) ?? null;
  }

  async update(id: string, updates: Partial<ImportExportRecord>): Promise<void> {
    const existing = this.records.get(id);
    if (!existing) return;
    this.records.set(id, { ...existing, ...updates } as ImportExportRecord);
  }

  async list(tenantId: string, type?: 'IMPORT' | 'EXPORT', limit = 50): Promise<readonly ImportExportRecord[]> {
    const result: ImportExportRecord[] = [];
    for (const record of this.records.values()) {
      if (record.tenantId !== tenantId) continue;
      if (type && record.type !== type) continue;
      result.push(record);
      if (result.length >= limit) break;
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}
