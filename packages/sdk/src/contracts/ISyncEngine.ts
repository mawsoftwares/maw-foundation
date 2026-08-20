/**
 * Background sync engine contract — queues mutations made while offline
 * and flushes them when connectivity returns.
 */

export interface SyncOperation {
  readonly id: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly tenantId: string;
  readonly method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly path: string;
  readonly body?: unknown;
  readonly createdAt: string;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly lastError?: string;
}

export type SyncState = 'idle' | 'syncing' | 'error' | 'paused';

export interface SyncProgress {
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly state: SyncState;
}

export interface ISyncEngine {
  readonly state: SyncState;
  enqueue(op: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>): Promise<string>;
  flush(): Promise<SyncProgress>;
  pause(): void;
  resume(): void;
  getQueue(tenantId: string): Promise<readonly SyncOperation[]>;
  clearQueue(tenantId: string): Promise<void>;
  onProgress(listener: (progress: SyncProgress) => void): () => void;
  onStateChange(listener: (state: SyncState) => void): () => void;
}
