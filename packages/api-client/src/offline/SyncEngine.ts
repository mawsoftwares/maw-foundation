import type { ISyncEngine, SyncOperation, SyncState, SyncProgress } from '@mawsoftwares/sdk/contracts/ISyncEngine';
import type { IOfflineStorage } from '@mawsoftwares/sdk/contracts/IOfflineStorage';
import type { INetworkManager } from '@mawsoftwares/sdk/contracts/INetworkManager';
import type { IConflictResolver, ConflictDetail } from '@mawsoftwares/sdk/contracts/IConflictResolver';
import type { ConflictStrategy } from '@mawsoftwares/sdk/contracts/IConflictResolver';
import type { ApiClient, ApiError } from '../index';

const QUEUE_ENTITY_TYPE = '__sync_queue';

export interface SyncEngineOptions {
  readonly client: ApiClient;
  readonly storage: IOfflineStorage;
  readonly networkManager: INetworkManager;
  readonly conflictResolver: IConflictResolver;
  readonly tenantId: string;
  readonly defaultStrategy?: ConflictStrategy;
  readonly syncIntervalMs?: number;
  readonly maxRetries?: number;
}

/**
 * Background sync engine — queues mutations made while offline
 * and flushes them when connectivity returns.
 */
export class SyncEngine implements ISyncEngine {
  private _state: SyncState = 'idle';
  private readonly progressListeners = new Set<(progress: SyncProgress) => void>();
  private readonly stateListeners = new Set<(state: SyncState) => void>();
  private readonly client: ApiClient;
  private readonly storage: IOfflineStorage;
  private readonly networkManager: INetworkManager;
  private readonly conflictResolver: IConflictResolver;
  private readonly tenantId: string;
  private readonly defaultStrategy: ConflictStrategy;
  private readonly maxRetries: number;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private networkCleanup: (() => void) | null = null;

  constructor(options: SyncEngineOptions) {
    this.client = options.client;
    this.storage = options.storage;
    this.networkManager = options.networkManager;
    this.conflictResolver = options.conflictResolver;
    this.tenantId = options.tenantId;
    this.defaultStrategy = options.defaultStrategy ?? 'last-write-wins';
    this.maxRetries = options.maxRetries ?? 3;

    this.networkCleanup = this.networkManager.onStatusChange((status) => {
      if (status === 'online' && this._state !== 'paused') {
        void this.flush();
      }
    });

    if (options.syncIntervalMs && options.syncIntervalMs > 0) {
      this.syncInterval = setInterval(() => {
        if (this.networkManager.isOnline() && this._state === 'idle') {
          void this.flush();
        }
      }, options.syncIntervalMs);
    }
  }

  get state(): SyncState {
    return this._state;
  }

  async enqueue(op: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const syncOp: SyncOperation = {
      ...op,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    await this.storage.put({
      id,
      entityType: QUEUE_ENTITY_TYPE,
      tenantId: this.tenantId,
      data: syncOp,
      version: 1,
      updatedAt: syncOp.createdAt,
      syncStatus: 'pending',
    });

    return id;
  }

  async flush(): Promise<SyncProgress> {
    if (this._state === 'paused') {
      return { total: 0, completed: 0, failed: 0, state: 'paused' };
    }

    if (!this.networkManager.isOnline()) {
      return { total: 0, completed: 0, failed: 0, state: 'idle' };
    }

    this.setState('syncing');

    const records = await this.storage.getAll({
      entityType: QUEUE_ENTITY_TYPE,
      tenantId: this.tenantId,
      sort: { field: 'createdAt', direction: 'asc' },
    });

    const ops = records.map((r) => r.data as SyncOperation);
    let completed = 0;
    let failed = 0;

    for (const op of ops) {
      try {
        await this.executeOp(op);
        await this.storage.remove(QUEUE_ENTITY_TYPE, op.id, this.tenantId);
        completed++;
      } catch (err) {
        const retryCount = op.retryCount + 1;
        if (retryCount >= (op.maxRetries || this.maxRetries)) {
          await this.storage.put({
            id: op.id,
            entityType: QUEUE_ENTITY_TYPE,
            tenantId: this.tenantId,
            data: { ...op, retryCount, lastError: String(err) },
            version: 1,
            updatedAt: new Date().toISOString(),
            syncStatus: 'error',
          });
          failed++;
        } else {
          await this.storage.put({
            id: op.id,
            entityType: QUEUE_ENTITY_TYPE,
            tenantId: this.tenantId,
            data: { ...op, retryCount, lastError: String(err) },
            version: 1,
            updatedAt: new Date().toISOString(),
            syncStatus: 'pending',
          });
          failed++;
        }
      }

      const progress: SyncProgress = { total: ops.length, completed, failed, state: 'syncing' };
      for (const fn of this.progressListeners) fn(progress);
    }

    this.setState(failed > 0 ? 'error' : 'idle');
    const finalProgress: SyncProgress = { total: ops.length, completed, failed, state: this._state };
    for (const fn of this.progressListeners) fn(finalProgress);
    return finalProgress;
  }

  pause(): void {
    this.setState('paused');
  }

  resume(): void {
    this.setState('idle');
    if (this.networkManager.isOnline()) {
      void this.flush();
    }
  }

  async getQueue(tenantId: string): Promise<readonly SyncOperation[]> {
    const records = await this.storage.getAll({
      entityType: QUEUE_ENTITY_TYPE,
      tenantId,
    });
    return records.map((r) => r.data as SyncOperation);
  }

  async clearQueue(tenantId: string): Promise<void> {
    await this.storage.clear(QUEUE_ENTITY_TYPE, tenantId);
  }

  onProgress(listener: (progress: SyncProgress) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  onStateChange(listener: (state: SyncState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.networkCleanup) {
      this.networkCleanup();
      this.networkCleanup = null;
    }
    this.progressListeners.clear();
    this.stateListeners.clear();
  }

  private setState(next: SyncState): void {
    if (next === this._state) return;
    this._state = next;
    for (const fn of this.stateListeners) fn(next);
  }

  private async executeOp(op: SyncOperation): Promise<void> {
    try {
      await this.client.request(op.path, {
        method: op.method,
        body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
      });

      // Mark the entity as synced in storage
      const entityRecord = await this.storage.get(op.entityType, op.entityId, op.tenantId);
      if (entityRecord) {
        await this.storage.put({ ...entityRecord, syncStatus: 'synced', localOnly: false });
      }
    } catch (err) {
      if (this.isConflict(err)) {
        await this.handleConflict(op, err as ApiError);
        return;
      }
      throw err;
    }
  }

  private isConflict(err: unknown): boolean {
    return err instanceof Error && 'status' in err && (err as { status: number }).status === 409;
  }

  private async handleConflict(op: SyncOperation, err: ApiError): Promise<void> {
    const serverVersion = err.body;
    const localRecord = await this.storage.get(op.entityType, op.entityId, op.tenantId);
    if (!localRecord) return;

    const conflict: ConflictDetail = {
      entityType: op.entityType,
      entityId: op.entityId,
      tenantId: op.tenantId,
      localVersion: localRecord.data,
      serverVersion,
      localUpdatedAt: localRecord.updatedAt,
      serverUpdatedAt: new Date().toISOString(),
    };

    try {
      const resolved = await this.conflictResolver.resolve(conflict, this.defaultStrategy);
      await this.client.request(op.path, {
        method: 'PUT',
        body: JSON.stringify(resolved.mergedData),
      });
      await this.storage.put({
        ...localRecord,
        data: resolved.mergedData,
        syncStatus: 'synced',
      });
    } catch {
      await this.storage.put({ ...localRecord, syncStatus: 'conflict' });
    }
  }
}
