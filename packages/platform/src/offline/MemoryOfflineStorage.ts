import type {
  IOfflineStorage,
  OfflineRecord,
  OfflineQuery,
} from '@maw/sdk/contracts/IOfflineStorage';

/**
 * In-memory IOfflineStorage for tests and SSR.
 * Data is lost on process exit — use IndexedDbOfflineStorage for persistence.
 */
export class MemoryOfflineStorage implements IOfflineStorage {
  private readonly store = new Map<string, OfflineRecord>();

  private key(entityType: string, id: string, tenantId: string): string {
    return `${tenantId}:${entityType}:${id}`;
  }

  async get(entityType: string, id: string, tenantId: string): Promise<OfflineRecord | null> {
    return this.store.get(this.key(entityType, id, tenantId)) ?? null;
  }

  async getAll(query: OfflineQuery): Promise<readonly OfflineRecord[]> {
    let results: OfflineRecord[] = [];
    for (const record of this.store.values()) {
      if (record.entityType !== query.entityType || record.tenantId !== query.tenantId) continue;
      if (query.filter) {
        const data = record.data as Record<string, unknown>;
        const matches = Object.entries(query.filter).every(([k, v]) => data[k] === v);
        if (!matches) continue;
      }
      results.push(record);
    }

    if (query.sort) {
      const { field, direction } = query.sort;
      results.sort((a, b) => {
        const av = String((a.data as Record<string, unknown>)[field] ?? '');
        const bv = String((b.data as Record<string, unknown>)[field] ?? '');
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    if (query.offset) results = results.slice(query.offset);
    if (query.limit) results = results.slice(0, query.limit);

    return results;
  }

  async put(record: OfflineRecord): Promise<void> {
    this.store.set(this.key(record.entityType, record.id, record.tenantId), record);
  }

  async putMany(records: readonly OfflineRecord[]): Promise<void> {
    for (const record of records) {
      this.store.set(this.key(record.entityType, record.id, record.tenantId), record);
    }
  }

  async remove(entityType: string, id: string, tenantId: string): Promise<void> {
    this.store.delete(this.key(entityType, id, tenantId));
  }

  async clear(entityType: string, tenantId: string): Promise<void> {
    for (const [key, record] of this.store) {
      if (record.entityType === entityType && record.tenantId === tenantId) {
        this.store.delete(key);
      }
    }
  }

  async clearAll(tenantId: string): Promise<void> {
    for (const [key, record] of this.store) {
      if (record.tenantId === tenantId) {
        this.store.delete(key);
      }
    }
  }

  async getPending(tenantId: string): Promise<readonly OfflineRecord[]> {
    const results: OfflineRecord[] = [];
    for (const record of this.store.values()) {
      if (record.tenantId === tenantId && record.syncStatus === 'pending') {
        results.push(record);
      }
    }
    return results;
  }

  async count(entityType: string, tenantId: string): Promise<number> {
    let n = 0;
    for (const record of this.store.values()) {
      if (record.entityType === entityType && record.tenantId === tenantId) n++;
    }
    return n;
  }
}
