import { pgTable, uuid, text, varchar, timestamp, index } from 'drizzle-orm/pg-core';

// A client owns one or more registered applications. 'internal' clients are
// Mindsatwork's own teams/products; 'external' clients are outside companies
// whose applications Mindsatwork builds or operates shared services for.
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 20 }).notNull().default('internal'),
  contactName: varchar('contact_name', { length: 200 }),
  contactEmail: varchar('contact_email', { length: 320 }),
  contactPhone: varchar('contact_phone', { length: 32 }),
  companyName: varchar('company_name', { length: 200 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  notes: text('notes'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_clients_tenant').on(table.tenantId),
  index('idx_clients_status').on(table.tenantId, table.status),
]);
