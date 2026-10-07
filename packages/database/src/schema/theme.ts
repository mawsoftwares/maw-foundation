import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Application-wide theme (design.md source) — see apps/sample-server/migrations/032_tenant_theme.up.sql.
export const tenantTheme = pgTable('tenant_theme', {
  tenantId: text('tenant_id').primaryKey(),
  designMd: text('design_md').notNull(),
  updatedBy: text('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
