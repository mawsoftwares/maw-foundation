import type { ID } from '../kernel/ids';

export const JobStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  CANCELLED: 'CANCELLED',
} as const;

export type JobStatusValue = (typeof JobStatus)[keyof typeof JobStatus];

export const BackoffStrategy = {
  FIXED: 'FIXED',
  LINEAR: 'LINEAR',
  EXPONENTIAL: 'EXPONENTIAL',
} as const;

export type BackoffStrategyValue = (typeof BackoffStrategy)[keyof typeof BackoffStrategy];

export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoff: BackoffStrategyValue;
  readonly maxDelayMs?: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: BackoffStrategy.EXPONENTIAL,
  maxDelayMs: 30000,
};

export interface JobContext {
  readonly tenantId: string;
  readonly userId?: string;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
  readonly [key: string]: unknown;
}

export interface JobDefinition<TData = unknown> {
  readonly id?: ID;
  readonly type: string;
  readonly data: TData;
  readonly context: JobContext;
  readonly priority?: number;
  readonly delayMs?: number;
  readonly retry?: Partial<RetryPolicy>;
  readonly deduplicationKey?: string;
  readonly timeoutMs?: number;
}

export interface Job<TData = unknown> {
  readonly id: ID;
  readonly type: string;
  readonly data: TData;
  readonly context: JobContext;
  readonly status: JobStatusValue;
  readonly priority: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly failedAt?: string;
  readonly nextRetryAt?: string;
  readonly error?: string;
  readonly result?: unknown;
}

export interface JobResult<TResult = unknown> {
  readonly success: boolean;
  readonly result?: TResult;
  readonly error?: string;
  readonly retryable?: boolean;
}

export interface WorkerOptions {
  readonly concurrency?: number;
  readonly pollIntervalMs?: number;
  readonly shutdownTimeoutMs?: number;
}
