import type { ConfigEngine } from '@mawsoftwares/sdk/config/config-engine';
import type { IOfflineStorage } from '@mawsoftwares/sdk/contracts/IOfflineStorage';
import type { INetworkManager } from '@mawsoftwares/sdk/contracts/INetworkManager';
import type { IConflictResolver } from '@mawsoftwares/sdk/contracts/IConflictResolver';
import type { ISyncEngine } from '@mawsoftwares/sdk/contracts/ISyncEngine';
import { BrowserNetworkManager } from '@mawsoftwares/platform';
import { MemoryOfflineStorage } from '@mawsoftwares/platform';
import { DefaultConflictResolver } from '@mawsoftwares/platform';
import { SyncEngine, installOfflineInterceptor } from '@mawsoftwares/api-client';
import type { ApiClient } from '@mawsoftwares/api-client';
import type { OfflineInterceptorHandle } from '@mawsoftwares/api-client';

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
