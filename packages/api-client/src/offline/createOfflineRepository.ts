import type { ConfigEngine } from '@maw/sdk/config/config-engine';
import type { IOfflineRepository, OfflineEntityConfig } from '@maw/sdk/contracts/IOfflineRepository';
import type { IOfflineStorage } from '@maw/sdk/contracts/IOfflineStorage';
import type { ISyncEngine } from '@maw/sdk/contracts/ISyncEngine';
import type { INetworkManager } from '@maw/sdk/contracts/INetworkManager';
import type { ApiClient } from '../index';
import { OnlineOnlyRepository } from './OnlineOnlyRepository';
import { OfflineRepository } from './OfflineRepository';

export interface OfflineDependencies {
  readonly storage: IOfflineStorage;
  readonly syncEngine: ISyncEngine;
  readonly networkManager: INetworkManager;
  readonly tenantId: string;
}

/**
 * Factory that creates the right repository based on the config engine.
 * When offline.enabled is false → OnlineOnlyRepository (zero overhead).
 * When offline.enabled is true  → OfflineRepository (full offline support).
 */
export function createOfflineRepository<T>(
  config: ConfigEngine,
  client: ApiClient,
  entityConfig: OfflineEntityConfig,
  deps?: OfflineDependencies,
): IOfflineRepository<T> {
  const enabled = config.getBool('offline.enabled', false);
  if (!enabled || !deps) {
    return new OnlineOnlyRepository<T>(client, entityConfig);
  }

  return new OfflineRepository<T>({
    client,
    storage: deps.storage,
    syncEngine: deps.syncEngine,
    networkManager: deps.networkManager,
    tenantId: deps.tenantId,
    entityConfig,
  });
}
