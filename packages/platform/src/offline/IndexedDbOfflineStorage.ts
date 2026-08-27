import type {
  IOfflineStorage,
  OfflineRecord,
  OfflineQuery,
} from '@mawsoftwares/sdk/contracts/IOfflineStorage';

export interface IndexedDbOfflineStorageOptions {
  readonly tenantId: string;
  readonly dbVersion?: number;
}

const DB_PREFIX = 'maw_offline_';
const STORE_NAME = 'records';

/**
 * IndexedDB-backed IOfflineStorage for web browsers.
 * Each tenant gets its own database for complete data isolation.
 */
export class IndexedDbOfflineStorage implements IOfflineStorage {
  private readonly tenantId: string;
  private readonly dbName: string;
  private readonly dbVersion: number;
  private db: IDBDatabase | null = null;

  constructor(options: IndexedDbOfflineStorageOptions) {
    this.tenantId = options.tenantId;
    this.dbName = `${DB_PREFIX}${this.tenantId}`;
    this.dbVersion = options.dbVersion ?? 1;
  }

  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: ['entityType', 'id'] });
          store.createIndex('by_entity', 'entityType', { unique: false });
          store.createIndex('by_sync', 'syncStatus', { unique: false });
          store.createIndex('by_entity_sync', ['entityType', 'syncStatus'], { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.open();
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  private wrap<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(entityType: string, id: string, tenantId: string): Promise<OfflineRecord | null> {
    if (tenantId !== this.tenantId) return null;
    const store = await this.tx('readonly');
    const result = await this.wrap<OfflineRecord | undefined>(store.get([entityType, id]));
    return result ?? null;
  }

  async getAll(query: OfflineQuery): Promise<readonly OfflineRecord[]> {
    if (query.tenantId !== this.tenantId) return [];
    const store = await this.tx('readonly');
    const index = store.index('by_entity');
    const raw = await this.wrap<OfflineRecord[]>(index.getAll(query.entityType));

    let results = raw.filter((r) => r.tenantId === query.tenantId);

    if (query.filter) {
      results = results.filter((r) => {
        const data = r.data as Record<string, unknown>;
        return Object.entries(query.filter!).every(([k, v]) => data[k] === v);
      });
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
    const store = await this.tx('readwrite');
    await this.wrap(store.put(record));
  }

  async putMany(records: readonly OfflineRecord[]): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const record of records) {
      store.put(record);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async remove(entityType: string, id: string, tenantId: string): Promise<void> {
    if (tenantId !== this.tenantId) return;
    const store = await this.tx('readwrite');
    await this.wrap(store.delete([entityType, id]));
  }

  async clear(entityType: string, tenantId: string): Promise<void> {
    if (tenantId !== this.tenantId) return;
    const store = await this.tx('readwrite');
    const index = store.index('by_entity');
    const keys = await this.wrap(index.getAllKeys(entityType));
    const db = await this.open();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const s = tx.objectStore(STORE_NAME);
    for (const key of keys) s.delete(key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(tenantId: string): Promise<void> {
    if (tenantId !== this.tenantId) return;
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPending(tenantId: string): Promise<readonly OfflineRecord[]> {
    if (tenantId !== this.tenantId) return [];
    const store = await this.tx('readonly');
    const index = store.index('by_sync');
    const results = await this.wrap<OfflineRecord[]>(index.getAll('pending'));
    return results.filter((r) => r.tenantId === tenantId);
  }

  async count(entityType: string, tenantId: string): Promise<number> {
    if (tenantId !== this.tenantId) return 0;
    const store = await this.tx('readonly');
    const index = store.index('by_entity');
    return this.wrap(index.count(entityType));
  }
}
