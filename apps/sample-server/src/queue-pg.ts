import type { PgPool } from '@mawsoftwares/database';
import type { IQueueProvider, Job, JobDefinition, JobStatusValue } from '@mawsoftwares/sdk';
import { JobStatus } from '@mawsoftwares/sdk';
import { mergeRetryPolicy } from '@mawsoftwares/queue';

interface JobDbRow {
  id: string;
  type: string;
  data: unknown;
  context: Record<string, unknown>;
  status: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  error: string | null;
  result: unknown;
  next_retry_at: Date | null;
  created_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  failed_at: Date | null;
}

function toJob(row: JobDbRow): Job {
  return {
    id: row.id,
    type: row.type,
    data: row.data,
    context: row.context as Job['context'],
    status: row.status as JobStatusValue,
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    error: row.error ?? undefined,
    result: row.result ?? undefined,
    nextRetryAt: row.next_retry_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    startedAt: row.started_at?.toISOString(),
    completedAt: row.completed_at?.toISOString(),
    failedAt: row.failed_at?.toISOString(),
  };
}

const JOB_COLUMNS = `id, type, data, context, status, priority, attempts, max_attempts,
  error, result, next_retry_at, created_at, started_at, completed_at, failed_at`;

export class PgQueueProvider implements IQueueProvider {
  readonly name = 'postgres';

  constructor(private readonly pool: PgPool) {}

  async enqueue<TData>(definition: JobDefinition<TData>): Promise<Job<TData>> {
    if (definition.deduplicationKey) {
      const { rows: existing } = await this.pool.query<JobDbRow>(
        `SELECT ${JOB_COLUMNS} FROM jobs
         WHERE type = $1 AND status IN ('PENDING','QUEUED','PROCESSING')
           AND context->>'deduplicationKey' = $2
         LIMIT 1`,
        [definition.type, definition.deduplicationKey],
      );
      if (existing[0]) return toJob(existing[0]) as Job<TData>;
    }

    const retryPolicy = mergeRetryPolicy(definition.retry);
    const id = definition.id ?? crypto.randomUUID();
    const context = {
      ...definition.context,
      ...(definition.deduplicationKey ? { deduplicationKey: definition.deduplicationKey } : {}),
    };

    const { rows } = await this.pool.query<JobDbRow>(
      `INSERT INTO jobs (id, type, data, context, status, priority, attempts, max_attempts)
       VALUES ($1, $2, $3, $4, 'QUEUED', $5, 0, $6)
       RETURNING ${JOB_COLUMNS}`,
      [id, definition.type, JSON.stringify(definition.data), JSON.stringify(context), definition.priority ?? 0, retryPolicy.maxAttempts],
    );

    return toJob(rows[0]!) as Job<TData>;
  }

  async dequeue(type: string): Promise<Job | null> {
    const { rows } = await this.pool.query<JobDbRow>(
      `UPDATE jobs SET status = 'PROCESSING', attempts = attempts + 1, started_at = NOW()
       WHERE id = (
         SELECT id FROM jobs
         WHERE type = $1
           AND (status = 'QUEUED' OR (status = 'RETRYING' AND (next_retry_at IS NULL OR next_retry_at <= NOW())))
         ORDER BY priority DESC, created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING ${JOB_COLUMNS}`,
      [type],
    );
    return rows[0] ? toJob(rows[0]) : null;
  }

  async complete(jobId: string, result?: unknown): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status = 'COMPLETED', completed_at = NOW(), result = $2 WHERE id = $1`,
      [jobId, result !== undefined ? JSON.stringify(result) : null],
    );
  }

  async fail(jobId: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status = 'FAILED', failed_at = NOW(), error = $2 WHERE id = $1`,
      [jobId, error],
    );
  }

  async retry(jobId: string, nextRetryAt: string): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status = 'RETRYING', next_retry_at = $2 WHERE id = $1`,
      [jobId, nextRetryAt],
    );
  }

  async cancel(jobId: string): Promise<void> {
    await this.pool.query(
      `UPDATE jobs SET status = 'CANCELLED' WHERE id = $1`,
      [jobId],
    );
  }

  async getJob(jobId: string): Promise<Job | null> {
    const { rows } = await this.pool.query<JobDbRow>(
      `SELECT ${JOB_COLUMNS} FROM jobs WHERE id = $1`,
      [jobId],
    );
    return rows[0] ? toJob(rows[0]) : null;
  }

  async getStatus(jobId: string): Promise<JobStatusValue | null> {
    const { rows } = await this.pool.query<{ status: string }>(
      `SELECT status FROM jobs WHERE id = $1`,
      [jobId],
    );
    return rows[0] ? (rows[0].status as JobStatusValue) : null;
  }

  async listJobs(type: string, status?: JobStatusValue, limit = 50): Promise<readonly Job[]> {
    if (status) {
      const { rows } = await this.pool.query<JobDbRow>(
        `SELECT ${JOB_COLUMNS} FROM jobs WHERE type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3`,
        [type, status, limit],
      );
      return rows.map(toJob);
    }
    const { rows } = await this.pool.query<JobDbRow>(
      `SELECT ${JOB_COLUMNS} FROM jobs WHERE type = $1 ORDER BY created_at DESC LIMIT $2`,
      [type, limit],
    );
    return rows.map(toJob);
  }
}
