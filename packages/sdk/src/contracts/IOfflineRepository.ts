/**
 * Repository abstraction that works identically online and offline.
 *
 * When offline is disabled → thin pass-through to ApiClient.
 * When offline is enabled  → reads/writes local storage first, enqueues sync operations.
 * Consuming code depends only on this interface — never on online/offline details.
 */

import type { SyncStatus } from './IOfflineStorage';
import type { ConflictStrategy } from './IConflictResolver';

export interface EntityMeta {
  readonly syncStatus: SyncStatus;
  readonly localOnly: boolean;
  readonly version: number;
  readonly updatedAt: string;
}

export interface OfflineEntityConfig {
  readonly entityType: string;
  readonly apiBasePath: string;
  readonly conflictStrategy?: ConflictStrategy;
  readonly syncPriority?: number;
  readonly ttlSeconds?: number;
}

export interface IOfflineRepository<T> {
  findAll(params?: Record<string, unknown>): Promise<{ readonly data: readonly T[]; readonly meta?: readonly EntityMeta[] }>;
  findById(id: string): Promise<{ readonly data: T; readonly meta?: EntityMeta } | null>;
  create(data: Partial<T>): Promise<{ readonly data: T; readonly meta?: EntityMeta }>;
  update(id: string, data: Partial<T>): Promise<{ readonly data: T; readonly meta?: EntityMeta }>;
  remove(id: string): Promise<void>;
  sync(): Promise<void>;
}
