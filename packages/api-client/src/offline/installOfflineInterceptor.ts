import type { IOfflineStorage, OfflineRecord } from '@maw/sdk/contracts/IOfflineStorage';
import type { INetworkManager } from '@maw/sdk/contracts/INetworkManager';
import type { ISyncEngine } from '@maw/sdk/contracts/ISyncEngine';
import type { ApiClient, CancellablePromise } from '../index';

export interface OfflineInterceptorOptions {
  readonly client: ApiClient;
  readonly storage: IOfflineStorage;
  readonly syncEngine: ISyncEngine;
  readonly networkManager: INetworkManager;
  readonly tenantId: string;
  readonly pathToEntity?: (path: string) => string | undefined;
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function defaultPathToEntity(path: string): string | undefined {
  const match = /^\/api\/([a-z][a-z0-9-]*)/.exec(path);
  return match?.[1];
}

export interface OfflineInterceptorHandle {
  remove(): void;
}

/**
 * Makes an `ApiClient` offline-aware by wrapping its `request` method.
 *
 * - **GET (online)**: normal request + caches response in offline storage.
 * - **GET (offline)**: serves from the offline cache, skips network.
 * - **Mutations (offline)**: queues in the SyncEngine; returns optimistic data.
 * - **Paths not matching `pathToEntity`**: pass through unchanged.
 *
 * Default path convention: `/api/orders` → entity `orders`, `/api/orders/123` → entity `orders` id `123`.
 *
 * Call `handle.remove()` to restore the original `request` method.
 */
export function installOfflineInterceptor(options: OfflineInterceptorOptions): OfflineInterceptorHandle {
  const { client, storage, syncEngine, networkManager, tenantId } = options;
  const pathToEntity = options.pathToEntity ?? defaultPathToEntity;

  const originalRequest = client.request.bind(client);

  client.request = function offlineAwareRequest<T>(
    path: string,
    init: RequestInit & { signal?: AbortSignal } = {},
  ): CancellablePromise<T> {
    const entityType = pathToEntity(path);

    if (!entityType) return originalRequest<T>(path, init);

    const method = (init.method ?? 'GET').toUpperCase();
    const controller = new AbortController();
    const externalSignal = init.signal;

    if (externalSignal?.aborted) {
      controller.abort(externalSignal.reason);
    } else if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
    }

    const promise = (async (): Promise<T> => {
      const isOnline = networkManager.isOnline();

      // --- GET ---
      if (method === 'GET') {
        if (isOnline) {
          try {
            const result = await originalRequest<T>(path, init);
            void cacheGetResult(storage, entityType, tenantId, result);
            return result;
          } catch {
            // Network error — fall through to cache
          }
        }
        return serveFromCache<T>(storage, entityType, tenantId, path);
      }

      // --- Mutations ---
      if (MUTATION_METHODS.has(method)) {
        if (isOnline) {
          const result = await originalRequest<T>(path, init);
          void cacheMutationResult(storage, entityType, tenantId, method, result);
          return result;
        }
        return handleOfflineMutation<T>(storage, syncEngine, entityType, tenantId, method, path, init.body);
      }

      return originalRequest<T>(path, init);
    })();

    const p = promise as CancellablePromise<T>;
    p.cancel = (reason?: string) => controller.abort(reason);
    return p;
  };

  return {
    remove() {
      client.request = originalRequest;
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function serveFromCache<T>(
  storage: IOfflineStorage,
  entityType: string,
  tenantId: string,
  path: string,
): Promise<T> {
  const tail = path.replace(/^\/api\/[a-z][a-z0-9-]*/, '').replace(/^\//, '').split('?')[0];

  if (tail && tail !== '') {
    const record = await storage.get(entityType, tail, tenantId);
    if (record) return record.data as T;
    return undefined as T;
  }

  const records = await storage.getAll({ entityType, tenantId });
  return records.map((r) => r.data) as T;
}

async function cacheGetResult(
  storage: IOfflineStorage,
  entityType: string,
  tenantId: string,
  result: unknown,
): Promise<void> {
  try {
    if (Array.isArray(result)) {
      const records: OfflineRecord[] = (result as Array<Record<string, unknown>>)
        .filter((item) => 'id' in item)
        .map((item) => ({
          id: String(item['id']),
          entityType,
          tenantId,
          data: item,
          version: 1,
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced' as const,
        }));
      if (records.length > 0) await storage.putMany(records);
    } else if (result !== null && typeof result === 'object' && 'id' in result) {
      const item = result as Record<string, unknown>;
      await storage.put({
        id: String(item['id']),
        entityType,
        tenantId,
        data: item,
        version: 1,
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      });
    }
  } catch {
    // Caching failure must not break the normal flow
  }
}

async function cacheMutationResult(
  storage: IOfflineStorage,
  entityType: string,
  tenantId: string,
  method: string,
  result: unknown,
): Promise<void> {
  try {
    if (method === 'DELETE') return;
    if (result !== null && typeof result === 'object' && 'id' in result) {
      const item = result as Record<string, unknown>;
      await storage.put({
        id: String(item['id']),
        entityType,
        tenantId,
        data: item,
        version: 1,
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
      });
    }
  } catch {
    // Caching failure must not break the normal flow
  }
}

async function handleOfflineMutation<T>(
  storage: IOfflineStorage,
  syncEngine: ISyncEngine,
  entityType: string,
  tenantId: string,
  method: string,
  path: string,
  body: BodyInit | null | undefined,
): Promise<T> {
  const tail = path.replace(/^\/api\/[a-z][a-z0-9-]*/, '').replace(/^\//, '');
  const entityId = tail || `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const parsed = typeof body === 'string' ? (JSON.parse(body) as unknown) : undefined;

  await syncEngine.enqueue({
    entityType,
    entityId,
    tenantId,
    method: method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path,
    body: parsed,
    maxRetries: 3,
  });

  if (method === 'DELETE') {
    await storage.remove(entityType, entityId, tenantId);
    return undefined as T;
  }

  const data = { ...(parsed as Record<string, unknown> ?? {}), id: entityId };
  await storage.put({
    id: entityId,
    entityType,
    tenantId,
    data,
    version: 1,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
    localOnly: method === 'POST',
  });

  return data as T;
}
