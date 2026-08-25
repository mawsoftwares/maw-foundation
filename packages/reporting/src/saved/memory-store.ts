import type { SavedReport, ISavedReportStore } from './types';

export class InMemorySavedReportStore implements ISavedReportStore {
  private readonly store = new Map<string, SavedReport>();

  async save(report: SavedReport): Promise<void> {
    this.store.set(report.id, report);
  }

  async get(id: string): Promise<SavedReport | null> {
    return this.store.get(id) ?? null;
  }

  async update(id: string, updates: Partial<SavedReport>): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) return;
    this.store.set(id, { ...existing, ...updates });
  }

  async list(tenantId: string, definitionName?: string): Promise<readonly SavedReport[]> {
    return [...this.store.values()]
      .filter((r) => r.tenantId === tenantId && (!definitionName || r.definitionName === definitionName))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listByUser(
    tenantId: string,
    userId: string,
    definitionName?: string,
  ): Promise<readonly SavedReport[]> {
    return [...this.store.values()]
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.userId === userId &&
          (!definitionName || r.definitionName === definitionName),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
