import { pgTable, text, bigserial, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: jsonb('details'),
  ip: text('ip'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_logs_tenant').on(table.tenantId, table.createdAt),
  index('idx_audit_logs_user').on(table.tenantId, table.userId, table.createdAt),
]);
