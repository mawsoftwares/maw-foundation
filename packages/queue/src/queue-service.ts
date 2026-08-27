import type { IQueueProvider, IQueueService, Job, JobDefinition, JobStatusValue, Logger } from '@mawsoftwares/sdk';
import { createLogger } from '@mawsoftwares/sdk';

export interface QueueServiceOptions {
  readonly provider: IQueueProvider;
  readonly logger?: Logger;
}

export class QueueService implements IQueueService {
  private readonly provider: IQueueProvider;
  private readonly logger: Logger;

  constructor(options: QueueServiceOptions) {
    this.provider = options.provider;
    this.logger = options.logger ?? createLogger('queue');
  }

  async enqueue<TData>(definition: JobDefinition<TData>): Promise<Job<TData>> {
    this.logger.info('Enqueueing job', {
      type: definition.type,
      tenantId: definition.context.tenantId,
      correlationId: definition.context.correlationId,
      priority: definition.priority,
      idempotencyKey: definition.context.idempotencyKey,
    });

    const job = await this.provider.enqueue(definition);

    this.logger.info('Job enqueued', {
      jobId: job.id,
      type: job.type,
      status: job.status,
    });

    return job;
  }

  async getJob(jobId: string): Promise<Job | null> {
    return this.provider.getJob(jobId);
  }

  async getStatus(jobId: string): Promise<JobStatusValue | null> {
    return this.provider.getStatus(jobId);
  }

  async cancel(jobId: string): Promise<void> {
    this.logger.info('Cancelling job', { jobId });
    await this.provider.cancel(jobId);
  }
}
