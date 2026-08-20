import type { ConfigEngine } from '@maw/sdk/config/config-engine';
import type { IOfflineStorage } from '@maw/sdk/contracts/IOfflineStorage';
import type { INetworkManager } from '@maw/sdk/contracts/INetworkManager';
import type { IConflictResolver } from '@maw/sdk/contracts/IConflictResolver';
import type { ISyncEngine } from '@maw/sdk/contracts/ISyncEngine';
import { BrowserNetworkManager } from '@maw/platform';
import { MemoryOfflineStorage } from '@maw/platform';
import { DefaultConflictResolver } from '@maw/platform';
import { SyncEngine, installOfflineInterceptor } from '@maw/api-client';
import type { ApiClient } from '@maw/api-client';
import type { OfflineInterceptorHandle } from '@maw/api-client';

export interface OfflineSetupResult {
  readonly enabled: boolean;
  readonly networkManager?: INetworkManager;
  readonly syncEngine?: ISyncEngine;
  readonly storage?: IOfflineStorage;
  readonly conflictResolver?: IConflictResolver;
  readonly interceptorHandle?: OfflineInterceptorHandle;
}

export function setupOffline(
  config: ConfigEngine,
  client: ApiClient,
  tenantId: string,
): OfflineSetupResult {
  const enabled = config.getBool('offline.enabled', false) ?? false;
  if (!enabled) return { enabled: false };

  const networkManager = new BrowserNetworkManager({
    healthEndpoint: undefined,
  });

  const storage = new MemoryOfflineStorage();
  const conflictResolver = new DefaultConflictResolver();

  const syncEngine = new SyncEngine({
    client,
    storage,
    networkManager,
    conflictResolver,
    tenantId,
    syncIntervalMs: config.getNumber('offline.syncIntervalMs', 30_000),
    maxRetries: config.getNumber('offline.maxRetries', 3),
  });

  const interceptorHandle = installOfflineInterceptor({
    client,
    storage,
    syncEngine,
    networkManager,
    tenantId,
  });

  return { enabled: true, networkManager, syncEngine, storage, conflictResolver, interceptorHandle };
}
