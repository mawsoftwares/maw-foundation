import type { Job, JobDefinition, JobResult, JobStatusValue } from './types';

export type JobHandler<TData = unknown, TResult = unknown> = (job: Job<TData>) => Promise<JobResult<TResult>>;

export interface IQueueProvider {
  readonly name: string;
  enqueue<TData>(definition: JobDefinition<TData>): Promise<Job<TData>>;
  dequeue(type: string): Promise<Job | null>;
  complete(jobId: string, result?: unknown): Promise<void>;
  fail(jobId: string, error: string, retryable?: boolean): Promise<void>;
  retry(jobId: string, nextRetryAt: string): Promise<void>;
  cancel(jobId: string): Promise<void>;
  getJob(jobId: string): Promise<Job | null>;
  getStatus(jobId: string): Promise<JobStatusValue | null>;
  listJobs(type: string, status?: JobStatusValue, limit?: number): Promise<readonly Job[]>;
}

export interface IQueueService {
  enqueue<TData>(definition: JobDefinition<TData>): Promise<Job<TData>>;
  getJob(jobId: string): Promise<Job | null>;
  getStatus(jobId: string): Promise<JobStatusValue | null>;
  cancel(jobId: string): Promise<void>;
}

export interface IWorkerRegistry {
  register<TData, TResult>(type: string, handler: JobHandler<TData, TResult>): void;
  has(type: string): boolean;
  resolve(type: string): JobHandler | undefined;
  types(): readonly string[];
}
