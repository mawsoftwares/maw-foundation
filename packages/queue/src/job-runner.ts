import type { IQueueProvider, IWorkerRegistry, Job, JobResult, Logger, RetryPolicy, WorkerOptions } from '@mawsoftwares/sdk';
import { createLogger } from '@mawsoftwares/sdk';
import { computeDelay, mergeRetryPolicy, shouldRetry } from './retry';

export interface JobRunnerOptions {
  readonly provider: IQueueProvider;
  readonly registry: IWorkerRegistry;
  readonly options?: WorkerOptions;
  readonly defaultRetryPolicy?: Partial<RetryPolicy>;
  readonly logger?: Logger;
}

const DEFAULT_POLL_INTERVAL = 1000;
const DEFAULT_SHUTDOWN_TIMEOUT = 10000;

export class JobRunner {
  private readonly provider: IQueueProvider;
  private readonly registry: IWorkerRegistry;
  private readonly pollIntervalMs: number;
  private readonly shutdownTimeoutMs: number;
  private readonly defaultRetryPolicy: Partial<RetryPolicy>;
  private readonly logger: Logger;
  private running = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(opts: JobRunnerOptions) {
    this.provider = opts.provider;
    this.registry = opts.registry;
    this.pollIntervalMs = opts.options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
    this.shutdownTimeoutMs = opts.options?.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT;
    this.defaultRetryPolicy = opts.defaultRetryPolicy ?? {};
    this.logger = opts.logger ?? createLogger('job-runner');
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.logger.info('JobRunner started', { types: this.registry.types() });
    this.poll();
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
    this.logger.info('JobRunner stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  private poll(): void {
    if (!this.running) return;

    void this.tick().finally(() => {
      if (this.running) {
        const timer = setTimeout(() => this.poll(), this.pollIntervalMs);
        this.timers.push(timer);
      }
    });
  }

  private async tick(): Promise<void> {
    const types = this.registry.types();
    for (const type of types) {
      if (!this.running) break;
      const job = await this.provider.dequeue(type);
      if (job) {
        await this.process(job);
      }
    }
  }

  private async process(job: Job): Promise<void> {
    const handler = this.registry.resolve(job.type);
    if (!handler) {
      this.logger.error('No handler for job type', { type: job.type, jobId: job.id });
      await this.provider.fail(job.id, `No handler registered for type: ${job.type}`);
      return;
    }

    this.logger.info('Processing job', { jobId: job.id, type: job.type, attempt: job.attempts });

    try {
      const result: JobResult = await handler(job);

      if (result.success) {
        await this.provider.complete(job.id, result.result);
        this.logger.info('Job completed', { jobId: job.id, type: job.type });
      } else if (result.retryable !== false && shouldRetry(job.attempts, job.maxAttempts)) {
        const policy = mergeRetryPolicy({ ...this.defaultRetryPolicy, maxAttempts: job.maxAttempts });
        const delay = computeDelay(policy, job.attempts);
        const nextRetryAt = new Date(Date.now() + delay).toISOString();
        await this.provider.retry(job.id, nextRetryAt);
        this.logger.warn('Job scheduled for retry', {
          jobId: job.id,
          type: job.type,
          attempt: job.attempts,
          nextRetryAt,
        });
      } else {
        await this.provider.fail(job.id, result.error ?? 'Job failed');
        this.logger.error('Job failed permanently', { jobId: job.id, type: job.type, error: result.error });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (shouldRetry(job.attempts, job.maxAttempts)) {
        const policy = mergeRetryPolicy({ ...this.defaultRetryPolicy, maxAttempts: job.maxAttempts });
        const delay = computeDelay(policy, job.attempts);
        const nextRetryAt = new Date(Date.now() + delay).toISOString();
        await this.provider.retry(job.id, nextRetryAt);
        this.logger.warn('Job threw error, retrying', { jobId: job.id, error: errorMsg, nextRetryAt });
      } else {
        await this.provider.fail(job.id, errorMsg);
        this.logger.error('Job threw error, no retries left', { jobId: job.id, error: errorMsg });
      }
    }
  }
}
