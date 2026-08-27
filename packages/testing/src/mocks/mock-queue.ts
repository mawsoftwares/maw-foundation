import type { IQueueProvider } from '@mawsoftwares/sdk/queue/contracts';
import type { Job, JobDefinition, JobStatusValue } from '@mawsoftwares/sdk/queue/types';
import { JobStatus, DEFAULT_RETRY_POLICY } from '@mawsoftwares/sdk/queue/types';
import { newId } from '@mawsoftwares/sdk/kernel/id';

export class MockQueueProvider implements IQueueProvider {
  readonly name = 'mock';
  private readonly jobs = new Map<string, Job>();

  async enqueue<TData>(definition: JobDefinition<TData>): Promise<Job<TData>> {
    const id = definition.id ?? newId('job');
    const job: Job<TData> = {
      id,
      type: definition.type,
      data: definition.data,
      context: definition.context,
      status: JobStatus.QUEUED,
      priority: definition.priority ?? 0,
      attempts: 0,
      maxAttempts: definition.retry?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job as Job);
    return job;
  }

  async dequeue(type: string): Promise<Job | null> {
    for (const job of this.jobs.values()) {
      if (job.type === type && job.status === JobStatus.QUEUED) {
        const updated: Job = { ...job, status: JobStatus.PROCESSING, startedAt: new Date().toISOString(), attempts: job.attempts + 1 };
        this.jobs.set(job.id, updated);
        return updated;
      }
    }
    return null;
  }

  async complete(jobId: string, result?: unknown): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, { ...job, status: JobStatus.COMPLETED, completedAt: new Date().toISOString(), result });
  }

  async fail(jobId: string, error: string, _retryable?: boolean): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, { ...job, status: JobStatus.FAILED, failedAt: new Date().toISOString(), error });
  }

  async retry(jobId: string, nextRetryAt: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, { ...job, status: JobStatus.RETRYING, nextRetryAt });
  }

  async cancel(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, { ...job, status: JobStatus.CANCELLED });
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async getStatus(jobId: string): Promise<JobStatusValue | null> {
    return this.jobs.get(jobId)?.status ?? null;
  }

  async listJobs(type: string, status?: JobStatusValue, limit?: number): Promise<readonly Job[]> {
    const matches: Job[] = [];
    for (const job of this.jobs.values()) {
      if (job.type !== type) continue;
      if (status && job.status !== status) continue;
      matches.push(job);
      if (limit && matches.length >= limit) break;
    }
    return matches;
  }

  assertEnqueued(type: string, dataMatcher?: (data: unknown) => boolean): void {
    const matches = [...this.jobs.values()].filter((j) => j.type === type);
    if (matches.length === 0) {
      throw new Error(`Expected a job of type "${type}" to have been enqueued but none was found.`);
    }
    if (dataMatcher && !matches.some((j) => dataMatcher(j.data))) {
      throw new Error(`Job of type "${type}" was enqueued but no data matched the predicate.`);
    }
  }

  reset(): void {
    this.jobs.clear();
  }
}
