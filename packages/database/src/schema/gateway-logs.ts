import { pgTable, uuid, text, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';

// One row per Service Gateway request (id doubles as the requestId returned
// to the caller). errorCode is a safe, redacted code only — never a raw
// provider error message or stack trace (see LogRedactor / ADR error
// handling). credentialId is nullable and ON DELETE SET NULL so revoking or
// hard-deleting a credential later never breaks historical log rows.
export const serviceRequestLogs = pgTable('service_request_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  applicationId: uuid('application_id').notNull(),
  environmentId: uuid('environment_id').notNull(),
  credentialId: uuid('credential_id'),
  serviceCode: varchar('service_code', { length: 50 }).notNull(),
  endpoint: varchar('endpoint', { length: 200 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('accepted'),
  provider: varchar('provider', { length: 50 }),
  durationMs: integer('duration_ms'),
  errorCode: varchar('error_code', { length: 50 }),
  retryCount: integer('retry_count').notNull().default(0),
  idempotencyKey: varchar('idempotency_key', { length: 200 }),
  requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_service_request_logs_application').on(table.applicationId, table.createdAt),
  index('idx_service_request_logs_environment').on(table.environmentId, table.createdAt),
  index('idx_service_request_logs_tenant').on(table.tenantId, table.createdAt),
  index('idx_service_request_logs_idempotency').on(table.idempotencyKey),
  index('idx_service_request_logs_status').on(table.status, table.createdAt),
]);
