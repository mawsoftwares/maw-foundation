/**
 * Offline module configuration and registration types.
 * Used by modules opting in to offline capability.
 */

import type { ConflictStrategy } from '../contracts/IConflictResolver';

export interface OfflineModuleConfig {
  readonly enabled: boolean;
  readonly storageQuotaMb?: number;
  readonly syncIntervalMs?: number;
  readonly maxRetries?: number;
  readonly conflictStrategy?: ConflictStrategy;
  readonly encryptionEnabled?: boolean;
}

export const OFFLINE_CONFIG_DEFAULTS: OfflineModuleConfig = {
  enabled: false,
  storageQuotaMb: 50,
  syncIntervalMs: 30_000,
  maxRetries: 3,
  conflictStrategy: 'last-write-wins',
  encryptionEnabled: true,
};

export interface OfflineEntityRegistration {
  readonly entityType: string;
  readonly apiBasePath: string;
  readonly conflictStrategy?: ConflictStrategy;
  readonly syncPriority?: number;
  readonly ttlSeconds?: number;
  readonly idField?: string;
}

export interface OfflineModuleRegistration {
  readonly moduleKey: string;
  readonly entities: readonly OfflineEntityRegistration[];
}
