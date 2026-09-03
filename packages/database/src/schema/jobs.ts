import { pgTable, uuid, varchar, integer, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 128 }).notNull(),
  data: jsonb('data').notNull().default({}),
  context: jsonb('context').notNull().default({}),
  status: varchar('status', { length: 20 }).notNull().default('QUEUED'),
  priority: integer('priority').notNull().default(0),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  error: text('error'),
  result: jsonb('result'),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
  completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
  failedAt: timestamp('failed_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_jobs_type_status').on(table.type, table.status),
  index('idx_jobs_status').on(table.status),
  index('idx_jobs_retry').on(table.status, table.nextRetryAt),
]);
