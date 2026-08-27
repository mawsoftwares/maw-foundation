import { describe, expect, it, vi } from 'vitest';
import { computeDelay, mergeRetryPolicy, shouldRetry } from '../retry';
import { WorkerRegistry } from '../worker-registry';
import { InMemoryQueueProvider } from '../in-memory-provider';
import { QueueService } from '../queue-service';
import { JobRunner } from '../job-runner';
import { BackoffStrategy, DEFAULT_RETRY_POLICY, JobStatus } from '@mawsoftwares/sdk';
import type { JobDefinition, JobResult, RetryPolicy } from '@mawsoftwares/sdk';

const FAST_RETRY: Partial<RetryPolicy> = { delayMs: 5, backoff: BackoffStrategy.FIXED };

describe('retry', () => {
  it('computes fixed delay', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, backoff: BackoffStrategy.FIXED, delayMs: 500 };
    expect(computeDelay(policy, 1)).toBe(500);
    expect(computeDelay(policy, 3)).toBe(500);
  });

  it('computes linear delay', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, backoff: BackoffStrategy.LINEAR, delayMs: 100 };
    expect(computeDelay(policy, 1)).toBe(100);
    expect(computeDelay(policy, 3)).toBe(300);
  });

  it('computes exponential delay', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, backoff: BackoffStrategy.EXPONENTIAL, delayMs: 100 };
    expect(computeDelay(policy, 1)).toBe(100);
    expect(computeDelay(policy, 3)).toBe(400);
  });

  it('caps at maxDelayMs', () => {
    const policy = { ...DEFAULT_RETRY_POLICY, backoff: BackoffStrategy.EXPONENTIAL, delayMs: 1000, maxDelayMs: 5000 };
    expect(computeDelay(policy, 10)).toBe(5000);
  });

  it('merges partial retry policy with defaults', () => {
    const merged = mergeRetryPolicy({ maxAttempts: 5 });
    expect(merged.maxAttempts).toBe(5);
    expect(merged.backoff).toBe(DEFAULT_RETRY_POLICY.backoff);
  });

  it('shouldRetry returns true when attempts < maxAttempts', () => {
    expect(shouldRetry(1, 3)).toBe(true);
    expect(shouldRetry(3, 3)).toBe(false);
  });
});

describe('WorkerRegistry', () => {
  it('registers and resolves a handler', () => {
    const registry = new WorkerRegistry();
    const handler = async () => ({ success: true });
    registry.register('test-job', handler);
    expect(registry.has('test-job')).toBe(true);
    expect(registry.resolve('test-job')).toBe(handler);
  });

  it('returns undefined for unknown type', () => {
    const registry = new WorkerRegistry();
    expect(registry.resolve('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });

  it('lists registered types', () => {
    const registry = new WorkerRegistry();
    registry.register('a', async () => ({ success: true }));
    registry.register('b', async () => ({ success: true }));
    expect(registry.types()).toEqual(['a', 'b']);
  });
});

describe('InMemoryQueueProvider', () => {
  const makeDefinition = (overrides?: Partial<JobDefinition>): JobDefinition => ({
    type: 'test',
    data: { foo: 'bar' },
    context: { tenantId: 't1' },
    ...overrides,
  });

  it('enqueues and dequeues a job', async () => {
    const provider = new InMemoryQueueProvider();
    const job = await provider.enqueue(makeDefinition());
    expect(job.status).toBe(JobStatus.QUEUED);
    expect(job.type).toBe('test');

    const dequeued = await provider.dequeue('test');
    expect(dequeued).not.toBeNull();
    expect(dequeued!.id).toBe(job.id);
    expect(dequeued!.status).toBe(JobStatus.PROCESSING);
    expect(dequeued!.attempts).toBe(1);
  });

  it('returns null when queue is empty', async () => {
    const provider = new InMemoryQueueProvider();
    expect(await provider.dequeue('test')).toBeNull();
  });

  it('completes a job', async () => {
    const provider = new InMemoryQueueProvider();
    const job = await provider.enqueue(makeDefinition());
    await provider.dequeue('test');
    await provider.complete(job.id, { done: true });

    const completed = await provider.getJob(job.id);
    expect(completed!.status).toBe(JobStatus.COMPLETED);
    expect(completed!.result).toEqual({ done: true });
  });

  it('fails a job', async () => {
    const provider = new InMemoryQueueProvider();
    const job = await provider.enqueue(makeDefinition());
    await provider.dequeue('test');
    await provider.fail(job.id, 'oops');

    const failed = await provider.getJob(job.id);
    expect(failed!.status).toBe(JobStatus.FAILED);
    expect(failed!.error).toBe('oops');
  });

  it('retries a job', async () => {
    const provider = new InMemoryQueueProvider();
    const job = await provider.enqueue(makeDefinition());
    await provider.dequeue('test');
    const nextRetryAt = new Date(Date.now() - 1000).toISOString();
    await provider.retry(job.id, nextRetryAt);

    const retrying = await provider.getJob(job.id);
    expect(retrying!.status).toBe(JobStatus.RETRYING);

    const dequeued = await provider.dequeue('test');
    expect(dequeued).not.toBeNull();
    expect(dequeued!.id).toBe(job.id);
  });

  it('deduplicates by key', async () => {
    const provider = new InMemoryQueueProvider();
    const job1 = await provider.enqueue(makeDefinition({ deduplicationKey: 'dup-1' }));
    const job2 = await provider.enqueue(makeDefinition({ deduplicationKey: 'dup-1' }));
    expect(job1.id).toBe(job2.id);
  });

  it('cancels a job', async () => {
    const provider = new InMemoryQueueProvider();
    const job = await provider.enqueue(makeDefinition());
    await provider.cancel(job.id);
    expect(await provider.getStatus(job.id)).toBe(JobStatus.CANCELLED);
  });

  it('lists jobs by type and status', async () => {
    const provider = new InMemoryQueueProvider();
    await provider.enqueue(makeDefinition());
    await provider.enqueue(makeDefinition());

    const all = await provider.listJobs('test');
    expect(all).toHaveLength(2);

    const queued = await provider.listJobs('test', JobStatus.QUEUED);
    expect(queued).toHaveLength(2);

    const completed = await provider.listJobs('test', JobStatus.COMPLETED);
    expect(completed).toHaveLength(0);
  });
});

describe('QueueService', () => {
  it('enqueues via provider and returns job', async () => {
    const provider = new InMemoryQueueProvider();
    const service = new QueueService({ provider });

    const job = await service.enqueue({
      type: 'email',
      data: { to: 'x@y.com' },
      context: { tenantId: 't1' },
    });

    expect(job.type).toBe('email');
    expect(job.status).toBe(JobStatus.QUEUED);
  });

  it('gets job status', async () => {
    const provider = new InMemoryQueueProvider();
    const service = new QueueService({ provider });
    const job = await service.enqueue({ type: 'x', data: {}, context: { tenantId: 't1' } });

    expect(await service.getStatus(job.id)).toBe(JobStatus.QUEUED);
  });

  it('cancels a job', async () => {
    const provider = new InMemoryQueueProvider();
    const service = new QueueService({ provider });
    const job = await service.enqueue({ type: 'x', data: {}, context: { tenantId: 't1' } });

    await service.cancel(job.id);
    expect(await service.getStatus(job.id)).toBe(JobStatus.CANCELLED);
  });
});

describe('JobRunner', () => {
  it('processes a job successfully', async () => {
    const provider = new InMemoryQueueProvider();
    const registry = new WorkerRegistry();
    registry.register('send-email', async (job) => ({ success: true, result: { sent: true } }));

    const runner = new JobRunner({ provider, registry, options: { pollIntervalMs: 50 }, defaultRetryPolicy: FAST_RETRY });

    await provider.enqueue({ type: 'send-email', data: { to: 'a@b.com' }, context: { tenantId: 't1' } });
    runner.start();

    await new Promise((r) => setTimeout(r, 200));
    await runner.stop();

    const jobs = await provider.listJobs('send-email', JobStatus.COMPLETED);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.result).toEqual({ sent: true });
  });

  it('retries a failed job', async () => {
    const provider = new InMemoryQueueProvider();
    const registry = new WorkerRegistry();
    let attempt = 0;
    registry.register('flaky', async () => {
      attempt++;
      if (attempt < 2) return { success: false, error: 'try again', retryable: true };
      return { success: true };
    });

    const runner = new JobRunner({ provider, registry, options: { pollIntervalMs: 50 }, defaultRetryPolicy: FAST_RETRY });

    await provider.enqueue({
      type: 'flaky',
      data: {},
      context: { tenantId: 't1' },
      retry: { maxAttempts: 3, delayMs: 10, backoff: BackoffStrategy.FIXED },
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 500));
    await runner.stop();

    const completed = await provider.listJobs('flaky', JobStatus.COMPLETED);
    expect(completed).toHaveLength(1);
  });

  it('fails permanently after max retries', async () => {
    const provider = new InMemoryQueueProvider();
    const registry = new WorkerRegistry();
    registry.register('always-fail', async () => ({ success: false, error: 'nope', retryable: true }));

    const runner = new JobRunner({ provider, registry, options: { pollIntervalMs: 50 }, defaultRetryPolicy: FAST_RETRY });

    await provider.enqueue({
      type: 'always-fail',
      data: {},
      context: { tenantId: 't1' },
      retry: { maxAttempts: 2, delayMs: 10, backoff: BackoffStrategy.FIXED },
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 500));
    await runner.stop();

    const failed = await provider.listJobs('always-fail', JobStatus.FAILED);
    expect(failed).toHaveLength(1);
  });

  it('handles thrown errors with retry', async () => {
    const provider = new InMemoryQueueProvider();
    const registry = new WorkerRegistry();
    let calls = 0;
    registry.register('throws', async () => {
      calls++;
      if (calls < 2) throw new Error('boom');
      return { success: true };
    });

    const runner = new JobRunner({ provider, registry, options: { pollIntervalMs: 50 }, defaultRetryPolicy: FAST_RETRY });

    await provider.enqueue({
      type: 'throws',
      data: {},
      context: { tenantId: 't1' },
      retry: { maxAttempts: 3, delayMs: 10, backoff: BackoffStrategy.FIXED },
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 500));
    await runner.stop();

    const completed = await provider.listJobs('throws', JobStatus.COMPLETED);
    expect(completed).toHaveLength(1);
  });
});
