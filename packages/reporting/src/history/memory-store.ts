import type { ReportRecord, IReportHistory } from './types';

export class InMemoryReportHistory implements IReportHistory {
  private readonly store = new Map<string, ReportRecord>();

  async create(record: ReportRecord): Promise<void> {
    this.store.set(record.id, record);
  }

  async get(id: string): Promise<ReportRecord | null> {
    return this.store.get(id) ?? null;
  }

  async update(id: string, updates: Partial<ReportRecord>): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) return;
    this.store.set(id, { ...existing, ...updates });
  }

  async list(tenantId: string, limit = 50): Promise<readonly ReportRecord[]> {
    return [...this.store.values()]
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async listByDefinition(
    tenantId: string,
    definitionName: string,
    limit = 50,
  ): Promise<readonly ReportRecord[]> {
    return [...this.store.values()]
      .filter((r) => r.tenantId === tenantId && r.definitionName === definitionName)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
