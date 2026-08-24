import type { IQueueProvider, Job, JobDefinition, JobStatusValue } from '@maw/sdk';
import { JobStatus } from '@maw/sdk';
import { mergeRetryPolicy } from './retry';

export class InMemoryQueueProvider implements IQueueProvider {
  readonly name = 'in-memory';
  private readonly jobs = new Map<string, Job>();
  private readonly queues = new Map<string, string[]>();

  async enqueue<TData>(definition: JobDefinition<TData>): Promise<Job<TData>> {
    if (definition.deduplicationKey) {
      for (const existing of this.jobs.values()) {
        if (
          existing.type === definition.type &&
          (existing.status === JobStatus.PENDING || existing.status === JobStatus.QUEUED || existing.status === JobStatus.PROCESSING)
        ) {
          const ctx = existing.context as Record<string, unknown>;
          if (ctx['deduplicationKey'] === definition.deduplicationKey) {
            return existing as Job<TData>;
          }
        }
      }
    }

    const retryPolicy = mergeRetryPolicy(definition.retry);
    const job: Job<TData> = {
      id: definition.id ?? crypto.randomUUID(),
      type: definition.type,
      data: definition.data,
      context: {
        ...definition.context,
        ...(definition.deduplicationKey ? { deduplicationKey: definition.deduplicationKey } : {}),
      },
      status: JobStatus.QUEUED,
      priority: definition.priority ?? 0,
      attempts: 0,
      maxAttempts: retryPolicy.maxAttempts,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job as Job);
    const queue = this.queues.get(definition.type) ?? [];
    queue.push(job.id);
    this.queues.set(definition.type, queue);

    return job;
  }

  async dequeue(type: string): Promise<Job | null> {
    const queue = this.queues.get(type);
    if (!queue || queue.length === 0) return null;

    for (let i = 0; i < queue.length; i++) {
      const jobId = queue[i]!;
      const job = this.jobs.get(jobId);
      if (!job) continue;
      if (job.status === JobStatus.QUEUED || job.status === JobStatus.RETRYING) {
        if (job.status === JobStatus.RETRYING && job.nextRetryAt) {
          if (new Date(job.nextRetryAt) > new Date()) continue;
        }
        queue.splice(i, 1);
        const updated: Job = {
          ...job,
          status: JobStatus.PROCESSING,
          attempts: job.attempts + 1,
          startedAt: new Date().toISOString(),
        };
        this.jobs.set(jobId, updated);
        return updated;
      }
    }
    return null;
  }

  async complete(jobId: string, result?: unknown): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      status: JobStatus.COMPLETED,
      completedAt: new Date().toISOString(),
      result,
    });
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      status: JobStatus.FAILED,
      failedAt: new Date().toISOString(),
      error,
    });
  }

  async retry(jobId: string, nextRetryAt: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    const updated: Job = { ...job, status: JobStatus.RETRYING, nextRetryAt };
    this.jobs.set(jobId, updated);
    const queue = this.queues.get(job.type) ?? [];
    queue.push(jobId);
    this.queues.set(job.type, queue);
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

  async listJobs(type: string, status?: JobStatusValue, limit = 50): Promise<readonly Job[]> {
    const result: Job[] = [];
    for (const job of this.jobs.values()) {
      if (job.type !== type) continue;
      if (status && job.status !== status) continue;
      result.push(job);
      if (result.length >= limit) break;
    }
    return result;
  }
}
