import type { IOfflineRepository, EntityMeta, OfflineEntityConfig } from '@mawsoftwares/sdk/contracts/IOfflineRepository';
import type { IOfflineStorage, OfflineRecord } from '@mawsoftwares/sdk/contracts/IOfflineStorage';
import type { ISyncEngine } from '@mawsoftwares/sdk/contracts/ISyncEngine';
import type { INetworkManager } from '@mawsoftwares/sdk/contracts/INetworkManager';
import type { ApiClient } from '../index';

export interface OfflineRepositoryOptions {
  readonly client: ApiClient;
  readonly storage: IOfflineStorage;
  readonly syncEngine: ISyncEngine;
  readonly networkManager: INetworkManager;
  readonly tenantId: string;
  readonly entityConfig: OfflineEntityConfig;
}

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function toMeta(record: OfflineRecord): EntityMeta {
  return {
    syncStatus: record.syncStatus,
    localOnly: record.localOnly ?? false,
    version: record.version,
    updatedAt: record.updatedAt,
  };
}

/**
 * Full offline-capable repository.
 * Online: fetches from API, caches locally.
 * Offline: reads/writes local storage, enqueues sync operations.
 */
export class OfflineRepository<T> implements IOfflineRepository<T> {
  private readonly client: ApiClient;
  private readonly storage: IOfflineStorage;
  private readonly syncEngine: ISyncEngine;
  private readonly networkManager: INetworkManager;
  private readonly tenantId: string;
  private readonly entityConfig: OfflineEntityConfig;

  constructor(options: OfflineRepositoryOptions) {
    this.client = options.client;
    this.storage = options.storage;
    this.syncEngine = options.syncEngine;
    this.networkManager = options.networkManager;
    this.tenantId = options.tenantId;
    this.entityConfig = options.entityConfig;
  }

  async findAll(params?: Record<string, unknown>): Promise<{ readonly data: readonly T[]; readonly meta?: readonly EntityMeta[] }> {
    if (this.networkManager.isOnline()) {
      try {
        const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
        const items = await this.client.request<T[]>(`${this.entityConfig.apiBasePath}${query}`);

        const records: OfflineRecord[] = items.map((item) => ({
          id: (item as Record<string, unknown>)['id'] as string,
          entityType: this.entityConfig.entityType,
          tenantId: this.tenantId,
          data: item,
          version: 1,
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced' as const,
        }));
        await this.storage.putMany(records);

        return { data: items, meta: records.map(toMeta) };
      } catch {
        // Fall through to local storage on network failure
      }
    }

    const records = await this.storage.getAll({
      entityType: this.entityConfig.entityType,
      tenantId: this.tenantId,
    });

    return {
      data: records.map((r) => r.data as T),
      meta: records.map(toMeta),
    };
  }

  async findById(id: string): Promise<{ readonly data: T; readonly meta?: EntityMeta } | null> {
    if (this.networkManager.isOnline()) {
      try {
        const item = await this.client.request<T>(`${this.entityConfig.apiBasePath}/${id}`);
        const record: OfflineRecord = {
          id,
          entityType: this.entityConfig.entityType,
          tenantId: this.tenantId,
          data: item,
          version: 1,
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced',
        };
        await this.storage.put(record);
        return { data: item, meta: toMeta(record) };
      } catch (err) {
        if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) return null;
        // Fall through to local on network error
      }
    }

    const record = await this.storage.get(this.entityConfig.entityType, id, this.tenantId);
    if (!record) return null;
    return { data: record.data as T, meta: toMeta(record) };
  }

  async create(data: Partial<T>): Promise<{ readonly data: T; readonly meta?: EntityMeta }> {
    if (this.networkManager.isOnline()) {
      try {
        const item = await this.client.request<T>(this.entityConfig.apiBasePath, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        const record: OfflineRecord = {
          id: (item as Record<string, unknown>)['id'] as string,
          entityType: this.entityConfig.entityType,
          tenantId: this.tenantId,
          data: item,
          version: 1,
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced',
        };
        await this.storage.put(record);
        return { data: item, meta: toMeta(record) };
      } catch {
        // Fall through to offline create
      }
    }

    const localId = generateId();
    const item = { ...data, id: localId } as T;
    const record: OfflineRecord = {
      id: localId,
      entityType: this.entityConfig.entityType,
      tenantId: this.tenantId,
      data: item,
      version: 1,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      localOnly: true,
    };
    await this.storage.put(record);

    await this.syncEngine.enqueue({
      entityType: this.entityConfig.entityType,
      entityId: localId,
      tenantId: this.tenantId,
      method: 'POST',
      path: this.entityConfig.apiBasePath,
      body: data,
      maxRetries: this.entityConfig.syncPriority ?? 3,
    });

    return { data: item, meta: toMeta(record) };
  }

  async update(id: string, data: Partial<T>): Promise<{ readonly data: T; readonly meta?: EntityMeta }> {
    if (this.networkManager.isOnline()) {
      try {
        const item = await this.client.request<T>(`${this.entityConfig.apiBasePath}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        const record: OfflineRecord = {
          id,
          entityType: this.entityConfig.entityType,
          tenantId: this.tenantId,
          data: item,
          version: 1,
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced',
        };
        await this.storage.put(record);
        return { data: item, meta: toMeta(record) };
      } catch {
        // Fall through to offline update
      }
    }

    const existing = await this.storage.get(this.entityConfig.entityType, id, this.tenantId);
    const merged = { ...(existing?.data as Record<string, unknown> ?? {}), ...data, id } as T;
    const record: OfflineRecord = {
      id,
      entityType: this.entityConfig.entityType,
      tenantId: this.tenantId,
      data: merged,
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };
    await this.storage.put(record);

    await this.syncEngine.enqueue({
      entityType: this.entityConfig.entityType,
      entityId: id,
      tenantId: this.tenantId,
      method: 'PUT',
      path: `${this.entityConfig.apiBasePath}/${id}`,
      body: data,
      maxRetries: this.entityConfig.syncPriority ?? 3,
    });

    return { data: merged, meta: toMeta(record) };
  }

  async remove(id: string): Promise<void> {
    if (this.networkManager.isOnline()) {
      try {
        await this.client.request<void>(`${this.entityConfig.apiBasePath}/${id}`, { method: 'DELETE' });
        await this.storage.remove(this.entityConfig.entityType, id, this.tenantId);
        return;
      } catch {
        // Fall through to offline delete
      }
    }

    await this.storage.remove(this.entityConfig.entityType, id, this.tenantId);

    await this.syncEngine.enqueue({
      entityType: this.entityConfig.entityType,
      entityId: id,
      tenantId: this.tenantId,
      method: 'DELETE',
      path: `${this.entityConfig.apiBasePath}/${id}`,
      maxRetries: this.entityConfig.syncPriority ?? 3,
    });
  }

  async sync(): Promise<void> {
    await this.syncEngine.flush();
  }
}
