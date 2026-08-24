import { describe, expect, it } from 'vitest';
import { InMemoryQueueProvider } from '../in-memory-provider';
import { QueueService } from '../queue-service';
import { WorkerRegistry } from '../worker-registry';
import { JobRunner } from '../job-runner';
import { BackoffStrategy, JobStatus } from '@maw/sdk';

describe('Queue Integration', () => {
  it('enqueue → process → complete end-to-end', async () => {
    const provider = new InMemoryQueueProvider();
    const queueService = new QueueService({ provider });
    const registry = new WorkerRegistry();

    const processedJobs: string[] = [];

    registry.register('send-welcome-email', async (job) => {
      processedJobs.push(job.id);
      return { success: true, result: { delivered: true } };
    });

    const job = await queueService.enqueue({
      type: 'send-welcome-email',
      data: { userId: 'u1', email: 'user@example.com' },
      context: { tenantId: 'restaurant-1', correlationId: 'signup-flow' },
    });

    expect(job.status).toBe(JobStatus.QUEUED);
    expect(await queueService.getStatus(job.id)).toBe(JobStatus.QUEUED);

    const runner = new JobRunner({
      provider,
      registry,
      options: { pollIntervalMs: 50 },
      defaultRetryPolicy: { delayMs: 5, backoff: BackoffStrategy.FIXED },
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 200));
    await runner.stop();

    expect(processedJobs).toContain(job.id);
    expect(await queueService.getStatus(job.id)).toBe(JobStatus.COMPLETED);

    const completed = await provider.getJob(job.id);
    expect(completed!.result).toEqual({ delivered: true });
    expect(completed!.attempts).toBe(1);
  });

  it('processes multiple job types concurrently', async () => {
    const provider = new InMemoryQueueProvider();
    const queueService = new QueueService({ provider });
    const registry = new WorkerRegistry();
    const log: string[] = [];

    registry.register('generate-receipt', async (job) => {
      log.push(`receipt:${(job.data as { orderId: string }).orderId}`);
      return { success: true };
    });

    registry.register('notify-kitchen', async (job) => {
      log.push(`kitchen:${(job.data as { table: number }).table}`);
      return { success: true };
    });

    await queueService.enqueue({
      type: 'generate-receipt',
      data: { orderId: 'ORD-001' },
      context: { tenantId: 'restaurant-1' },
    });

    await queueService.enqueue({
      type: 'notify-kitchen',
      data: { table: 5 },
      context: { tenantId: 'restaurant-1' },
    });

    await queueService.enqueue({
      type: 'generate-receipt',
      data: { orderId: 'ORD-002' },
      context: { tenantId: 'restaurant-1' },
    });

    const runner = new JobRunner({
      provider,
      registry,
      options: { pollIntervalMs: 50 },
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 300));
    await runner.stop();

    expect(log).toContain('receipt:ORD-001');
    expect(log).toContain('receipt:ORD-002');
    expect(log).toContain('kitchen:5');

    const receipts = await provider.listJobs('generate-receipt', JobStatus.COMPLETED);
    const kitchenJobs = await provider.listJobs('notify-kitchen', JobStatus.COMPLETED);
    expect(receipts).toHaveLength(2);
    expect(kitchenJobs).toHaveLength(1);
  });

  it('retries transient failures then succeeds', async () => {
    const provider = new InMemoryQueueProvider();
    const queueService = new QueueService({ provider });
    const registry = new WorkerRegistry();

    let attempts = 0;
    registry.register('flaky-payment', async () => {
      attempts++;
      if (attempts <= 2) return { success: false, error: 'Gateway timeout', retryable: true };
      return { success: true, result: { charged: true } };
    });

    const job = await queueService.enqueue({
      type: 'flaky-payment',
      data: { amount: 2500, currency: 'USD' },
      context: { tenantId: 'restaurant-1', idempotencyKey: 'pay-ord-001' },
      retry: { maxAttempts: 5, delayMs: 10, backoff: BackoffStrategy.FIXED },
    });

    const runner = new JobRunner({
      provider,
      registry,
      options: { pollIntervalMs: 50 },
      defaultRetryPolicy: { delayMs: 5, backoff: BackoffStrategy.FIXED },
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 800));
    await runner.stop();

    const final = await provider.getJob(job.id);
    expect(final!.status).toBe(JobStatus.COMPLETED);
    expect(final!.result).toEqual({ charged: true });
    expect(attempts).toBe(3);
  });

  it('permanently fails after exhausting retries', async () => {
    const provider = new InMemoryQueueProvider();
    const queueService = new QueueService({ provider });
    const registry = new WorkerRegistry();

    registry.register('bad-job', async () => {
      throw new Error('Database connection refused');
    });

    const job = await queueService.enqueue({
      type: 'bad-job',
      data: {},
      context: { tenantId: 'restaurant-1' },
      retry: { maxAttempts: 2, delayMs: 10, backoff: BackoffStrategy.FIXED },
    });

    const runner = new JobRunner({
      provider,
      registry,
      options: { pollIntervalMs: 50 },
      defaultRetryPolicy: { delayMs: 5, backoff: BackoffStrategy.FIXED },
    });

    runner.start();
    await new Promise((r) => setTimeout(r, 600));
    await runner.stop();

    const final = await provider.getJob(job.id);
    expect(final!.status).toBe(JobStatus.FAILED);
    expect(final!.error).toBe('Database connection refused');
  });

  it('deduplicates jobs with the same key', async () => {
    const provider = new InMemoryQueueProvider();
    const queueService = new QueueService({ provider });

    const job1 = await queueService.enqueue({
      type: 'sync-inventory',
      data: { sku: 'BURGER-01' },
      context: { tenantId: 'restaurant-1' },
      deduplicationKey: 'sync-BURGER-01',
    });

    const job2 = await queueService.enqueue({
      type: 'sync-inventory',
      data: { sku: 'BURGER-01' },
      context: { tenantId: 'restaurant-1' },
      deduplicationKey: 'sync-BURGER-01',
    });

    expect(job1.id).toBe(job2.id);

    const all = await provider.listJobs('sync-inventory');
    expect(all).toHaveLength(1);
  });

  it('cancels a job before processing', async () => {
    const provider = new InMemoryQueueProvider();
    const queueService = new QueueService({ provider });

    const job = await queueService.enqueue({
      type: 'send-promo',
      data: { campaign: 'summer-sale' },
      context: { tenantId: 'restaurant-1' },
    });

    await queueService.cancel(job.id);
    expect(await queueService.getStatus(job.id)).toBe(JobStatus.CANCELLED);

    const registry = new WorkerRegistry();
    let processed = false;
    registry.register('send-promo', async () => {
      processed = true;
      return { success: true };
    });

    const runner = new JobRunner({ provider, registry, options: { pollIntervalMs: 50 } });
    runner.start();
    await new Promise((r) => setTimeout(r, 200));
    await runner.stop();

    expect(processed).toBe(false);
  });

  it('preserves tenant context through the job lifecycle', async () => {
    const provider = new InMemoryQueueProvider();
    const queueService = new QueueService({ provider });
    const registry = new WorkerRegistry();

    let capturedContext: Record<string, unknown> | null = null;
    registry.register('audit-log', async (job) => {
      capturedContext = job.context as Record<string, unknown>;
      return { success: true };
    });

    await queueService.enqueue({
      type: 'audit-log',
      data: { action: 'order.created' },
      context: {
        tenantId: 'restaurant-42',
        userId: 'manager-1',
        correlationId: 'req-abc-123',
      },
    });

    const runner = new JobRunner({ provider, registry, options: { pollIntervalMs: 50 } });
    runner.start();
    await new Promise((r) => setTimeout(r, 200));
    await runner.stop();

    expect(capturedContext).not.toBeNull();
    expect(capturedContext!['tenantId']).toBe('restaurant-42');
    expect(capturedContext!['userId']).toBe('manager-1');
    expect(capturedContext!['correlationId']).toBe('req-abc-123');
  });
});
