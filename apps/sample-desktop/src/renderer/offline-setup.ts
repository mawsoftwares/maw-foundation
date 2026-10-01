import type { ConfigEngine } from '@mawsoftwares/sdk/config/config-engine';
import type { INetworkManager } from '@mawsoftwares/sdk/contracts/INetworkManager';
import type { ISyncEngine } from '@mawsoftwares/sdk/contracts/ISyncEngine';
import { BrowserNetworkManager, MemoryOfflineStorage, DefaultConflictResolver } from '@mawsoftwares/platform';
import { SyncEngine, installOfflineInterceptor } from '@mawsoftwares/api-client';
import type { ApiClient } from '@mawsoftwares/api-client';

export interface OfflineSetupResult {
  readonly enabled: boolean;
  readonly networkManager?: INetworkManager;
  readonly syncEngine?: ISyncEngine;
}

export function setupOffline(
  config: ConfigEngine,
  client: ApiClient,
  tenantId: string,
): OfflineSetupResult {
  const enabled = config.getBool('offline.enabled', false) ?? false;
  if (!enabled) return { enabled: false };

  const networkManager = new BrowserNetworkManager({ healthEndpoint: undefined });
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

  installOfflineInterceptor({ client, storage, syncEngine, networkManager, tenantId });

  return { enabled: true, networkManager, syncEngine };
}
