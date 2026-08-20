import type { IAuditStore, AuditEntry, AuditInput, AuditFilters } from './types';

export class MemoryAuditStore implements IAuditStore {
  private readonly entries: AuditEntry[] = [];
  private nextId = 1;

  async record(input: AuditInput): Promise<AuditEntry> {
    const entry: AuditEntry = {
      ...input,
      id: `audit-${this.nextId++}`,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }

  async query(filters?: AuditFilters): Promise<AuditEntry[]> {
    let result = this.entries;

    if (filters?.tenantId) result = result.filter((e) => e.tenantId === filters.tenantId);
    if (filters?.userId) result = result.filter((e) => e.userId === filters.userId);
    if (filters?.action) result = result.filter((e) => e.action === filters.action);
    if (filters?.resource) result = result.filter((e) => e.resource === filters.resource);
    if (filters?.resourceId) result = result.filter((e) => e.resourceId === filters.resourceId);
    if (filters?.from) {
      const from = filters.from;
      result = result.filter((e) => e.timestamp >= from);
    }
    if (filters?.to) {
      const to = filters.to;
      result = result.filter((e) => e.timestamp <= to);
    }

    result = result.slice().reverse();

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    return result.slice(offset, offset + limit);
  }

  async count(filters?: AuditFilters): Promise<number> {
    const all = await this.query({ ...filters, limit: Number.MAX_SAFE_INTEGER, offset: 0 });
    return all.length;
  }

  getAll(): readonly AuditEntry[] {
    return this.entries.slice().reverse();
  }

  clear(): void {
    this.entries.length = 0;
    this.nextId = 1;
  }
}
