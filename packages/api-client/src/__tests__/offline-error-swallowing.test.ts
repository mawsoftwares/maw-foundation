import { describe, it, expect, vi } from 'vitest';
import type { IOfflineStorage, OfflineRecord } from '@mawsoftwares/sdk/contracts/IOfflineStorage';
import type { ISyncEngine } from '@mawsoftwares/sdk/contracts/ISyncEngine';
import type { INetworkManager } from '@mawsoftwares/sdk/contracts/INetworkManager';
import { ApiError } from '../errors';
import { isConnectivityFailure } from '../index';
import { OfflineRepository } from '../offline/OfflineRepository';
import type { ApiClient } from '../index';

function makeStorage(): IOfflineStorage {
  const store = new Map<string, OfflineRecord>();
  return {
    async get(entityType, id, tenantId) {
      return store.get(`${entityType}:${tenantId}:${id}`) ?? null;
    },
    async getAll() {
      return Array.from(store.values());
    },
    async put(record) {
      store.set(`${record.entityType}:${record.tenantId}:${record.id}`, record);
    },
    async putMany(records) {
      for (const r of records) store.set(`${r.entityType}:${r.tenantId}:${r.id}`, r);
    },
    async remove(entityType, id, tenantId) {
      store.delete(`${entityType}:${tenantId}:${id}`);
    },
    async clear() {},
    async clearAll() {},
    async getPending() {
      return [];
    },
    async count() {
      return store.size;
    },
  };
}

function makeSyncEngine(): ISyncEngine {
  return {
    state: 'idle',
    enqueue: vi.fn(async () => 'op-1'),
    flush: vi.fn(async () => ({ total: 0, completed: 0, failed: 0, state: 'idle' as const })),
    pause: vi.fn(),
    resume: vi.fn(),
    getQueue: vi.fn(async () => []),
    clearQueue: vi.fn(async () => {}),
    onProgress: vi.fn(() => () => {}),
    onStateChange: vi.fn(() => () => {}),
  };
}

function makeNetworkManager(online: boolean): INetworkManager {
  return {
    status: online ? 'online' : 'offline',
    isOnline: () => online,
    onStatusChange: () => () => {},
    checkNow: async () => (online ? 'online' : 'offline'),
  };
}

describe('isConnectivityFailure', () => {
  it('treats a real HTTP error response as NOT a connectivity failure', () => {
    expect(isConnectivityFailure(new ApiError(422, 'Validation failed'))).toBe(false);
    expect(isConnectivityFailure(new ApiError(400, 'Bad request'))).toBe(false);
    expect(isConnectivityFailure(new ApiError(500, 'Server error'))).toBe(false);
  });

  it('treats a status-0 ApiError (network/timeout) as a connectivity failure', () => {
    expect(isConnectivityFailure(new ApiError(0, 'Network error'))).toBe(true);
  });

  it('treats a non-ApiError as a connectivity failure', () => {
    expect(isConnectivityFailure(new TypeError('Failed to fetch'))).toBe(true);
  });
});

describe('OfflineRepository — online error handling', () => {
  it('propagates a real 422 API error instead of silently falling through to offline behavior', async () => {
    const client = {
      request: vi.fn(async () => {
        throw new ApiError(422, 'Validation failed', { field: 'email' });
      }),
    } as unknown as ApiClient;

    const repo = new OfflineRepository<{ id: string }>({
      client,
      storage: makeStorage(),
      syncEngine: makeSyncEngine(),
      networkManager: makeNetworkManager(true),
      tenantId: 'tenant-1',
      entityConfig: { entityType: 'orders', apiBasePath: '/api/orders' },
    });

    await expect(repo.create({ id: 'x' } as never)).rejects.toThrow(ApiError);
    await expect(repo.create({ id: 'x' } as never)).rejects.toMatchObject({ status: 422 });
  });

  it('falls through to offline create on a genuine network failure', async () => {
    const client = {
      request: vi.fn(async () => {
        throw new ApiError(0, 'Network error');
      }),
    } as unknown as ApiClient;

    const syncEngine = makeSyncEngine();
    const repo = new OfflineRepository<{ id: string }>({
      client,
      storage: makeStorage(),
      syncEngine,
      networkManager: makeNetworkManager(true),
      tenantId: 'tenant-1',
      entityConfig: { entityType: 'orders', apiBasePath: '/api/orders' },
    });

    const result = await repo.create({ name: 'test' } as never);
    expect(result.meta?.syncStatus).toBe('pending');
    expect(syncEngine.enqueue).toHaveBeenCalled();
  });
});
