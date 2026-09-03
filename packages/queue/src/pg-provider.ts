import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, sql, desc, inArray, isNull, lte } from 'drizzle-orm';
import type { IQueueProvider, Job, JobDefinition, JobStatusValue } from '@mawsoftwares/sdk';
import { mergeRetryPolicy } from './retry';

type JobRow = typeof schema.jobs.$inferSelect;

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    type: row.type,
    data: row.data,
    context: row.context as Job['context'],
    status: row.status as JobStatusValue,
    priority: row.priority,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    error: row.error ?? undefined,
    result: row.result ?? undefined,
    nextRetryAt: row.nextRetryAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    failedAt: row.failedAt?.toISOString(),
  };
}

export class PgQueueProvider implements IQueueProvider {
  readonly name = 'postgres';

  constructor(private readonly db: DrizzleDb) {}

  async enqueue<TData>(definition: JobDefinition<TData>): Promise<Job<TData>> {
    if (definition.deduplicationKey) {
      const existing = await this.db
        .select()
        .from(schema.jobs)
        .where(and(
          eq(schema.jobs.type, definition.type),
          inArray(schema.jobs.status, ['PENDING', 'QUEUED', 'PROCESSING']),
          sql`${schema.jobs.context}->>'deduplicationKey' = ${definition.deduplicationKey}`,
        ))
        .limit(1);
      if (existing[0]) return toJob(existing[0]) as Job<TData>;
    }

    const retryPolicy = mergeRetryPolicy(definition.retry);
    const id = definition.id ?? crypto.randomUUID();
    const context = {
      ...definition.context,
      ...(definition.deduplicationKey ? { deduplicationKey: definition.deduplicationKey } : {}),
    };

    const rows = await this.db
      .insert(schema.jobs)
      .values({
        id,
        type: definition.type,
        data: JSON.parse(JSON.stringify(definition.data)),
        context: JSON.parse(JSON.stringify(context)),
        status: 'QUEUED',
        priority: definition.priority ?? 0,
        attempts: 0,
        maxAttempts: retryPolicy.maxAttempts,
      })
      .returning();

    return toJob(rows[0]!) as Job<TData>;
  }

  async dequeue(type: string): Promise<Job | null> {
    const rows = await this.db.execute<JobRow>(sql`
      UPDATE jobs SET status = 'PROCESSING', attempts = attempts + 1, started_at = NOW()
      WHERE id = (
        SELECT id FROM jobs
        WHERE type = ${type}
          AND (status = 'QUEUED' OR (status = 'RETRYING' AND (next_retry_at IS NULL OR next_retry_at <= NOW())))
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, type, data, context, status, priority, attempts, max_attempts AS "maxAttempts",
        error, result, next_retry_at AS "nextRetryAt", created_at AS "createdAt",
        started_at AS "startedAt", completed_at AS "completedAt", failed_at AS "failedAt"
    `);
    const row = (rows as unknown as JobRow[])[0];
    if (!row) return null;
    return toJob(row);
  }

  async complete(jobId: string, result?: unknown): Promise<void> {
    await this.db
      .update(schema.jobs)
      .set({ status: 'COMPLETED', completedAt: new Date(), result: result !== undefined ? JSON.parse(JSON.stringify(result)) : null })
      .where(eq(schema.jobs.id, jobId));
  }

  async fail(jobId: string, error: string): Promise<void> {
    await this.db
      .update(schema.jobs)
      .set({ status: 'FAILED', failedAt: new Date(), error })
      .where(eq(schema.jobs.id, jobId));
  }

  async retry(jobId: string, nextRetryAt: string): Promise<void> {
    await this.db
      .update(schema.jobs)
      .set({ status: 'RETRYING', nextRetryAt: new Date(nextRetryAt) })
      .where(eq(schema.jobs.id, jobId));
  }

  async cancel(jobId: string): Promise<void> {
    await this.db
      .update(schema.jobs)
      .set({ status: 'CANCELLED' })
      .where(eq(schema.jobs.id, jobId));
  }

  async getJob(jobId: string): Promise<Job | null> {
    const rows = await this.db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId));
    return rows[0] ? toJob(rows[0]) : null;
  }

  async getStatus(jobId: string): Promise<JobStatusValue | null> {
    const rows = await this.db
      .select({ status: schema.jobs.status })
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId));
    return rows[0] ? (rows[0].status as JobStatusValue) : null;
  }

  async listJobs(type: string, status?: JobStatusValue, limit = 50): Promise<readonly Job[]> {
    const conditions = [eq(schema.jobs.type, type)];
    if (status) conditions.push(eq(schema.jobs.status, status));
    const rows = await this.db
      .select()
      .from(schema.jobs)
      .where(and(...conditions))
      .orderBy(desc(schema.jobs.createdAt))
      .limit(limit);
    return rows.map(toJob);
  }
}
