/**
 * Conflict resolution contract — pluggable strategies for handling
 * data conflicts detected during sync.
 */

export interface ConflictDetail<T = unknown> {
  readonly entityType: string;
  readonly entityId: string;
  readonly tenantId: string;
  readonly localVersion: T;
  readonly serverVersion: T;
  readonly localUpdatedAt: string;
  readonly serverUpdatedAt: string;
  readonly conflictFields?: readonly string[];
}

export type ConflictResolution = 'local-wins' | 'server-wins' | 'merged';

export interface ResolvedConflict<T = unknown> {
  readonly resolution: ConflictResolution;
  readonly mergedData: T;
}

export type ConflictStrategy = 'last-write-wins' | 'server-wins' | 'client-wins' | 'manual';

export interface IConflictResolver {
  resolve<T>(conflict: ConflictDetail<T>, strategy: ConflictStrategy): Promise<ResolvedConflict<T>>;
  registerEntityResolver<T>(
    entityType: string,
    resolver: (conflict: ConflictDetail<T>) => Promise<ResolvedConflict<T>>,
  ): () => void;
}
