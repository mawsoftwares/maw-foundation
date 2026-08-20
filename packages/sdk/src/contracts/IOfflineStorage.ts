/**
 * Offline storage contract — platform-agnostic document store.
 * Implementations: IndexedDB (web), SQLite/AsyncStorage (React Native).
 * Every method requires tenantId for multi-tenant data isolation.
 */

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface OfflineRecord {
  readonly id: string;
  readonly entityType: string;
  readonly tenantId: string;
  readonly data: unknown;
  readonly version: number;
  readonly updatedAt: string;
  readonly syncStatus: SyncStatus;
  readonly localOnly?: boolean;
}

export interface OfflineQuery {
  readonly entityType: string;
  readonly tenantId: string;
  readonly filter?: Record<string, unknown>;
  readonly sort?: { readonly field: string; readonly direction: 'asc' | 'desc' };
  readonly limit?: number;
  readonly offset?: number;
}

export interface IOfflineStorage {
  get(entityType: string, id: string, tenantId: string): Promise<OfflineRecord | null>;
  getAll(query: OfflineQuery): Promise<readonly OfflineRecord[]>;
  put(record: OfflineRecord): Promise<void>;
  putMany(records: readonly OfflineRecord[]): Promise<void>;
  remove(entityType: string, id: string, tenantId: string): Promise<void>;
  clear(entityType: string, tenantId: string): Promise<void>;
  clearAll(tenantId: string): Promise<void>;
  getPending(tenantId: string): Promise<readonly OfflineRecord[]>;
  count(entityType: string, tenantId: string): Promise<number>;
}
