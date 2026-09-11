import { pgTable, uuid, text, varchar, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// A registered application belongs to a client and is the unit that owns
// environments, credentials, and enabled services.
export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  clientId: uuid('client_id').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  appType: varchar('app_type', { length: 20 }).notNull().default('other'),
  ownership: varchar('ownership', { length: 20 }).notNull().default('client_owned'),
  frontendUrl: text('frontend_url'),
  backendUrl: text('backend_url'),
  repositoryUrl: text('repository_url'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_applications_tenant').on(table.tenantId),
  index('idx_applications_client').on(table.clientId),
  index('idx_applications_status').on(table.tenantId, table.status),
]);

// Responsible team members for an application. Distinct from RBAC roles —
// roleLabel is a free-text descriptive label ("owner", "developer",
// "on-call"), not a permission grant. Access control stays entirely in
// @mawsoftwares/rbac-core; this table is informational/ownership only.
export const applicationMembers = pgTable('application_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull(),
  userId: text('user_id').notNull(),
  roleLabel: varchar('role_label', { length: 50 }).notNull().default('member'),
  addedBy: text('added_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_application_members_application').on(table.applicationId),
  index('idx_application_members_user').on(table.userId),
]);

// Development/Staging/Production (or a named custom environment) for one
// application. Credentials, service enablement, and rate/usage limits are
// all scoped to an environment row, never to the application directly —
// this is what makes Production credentials incapable of touching
// Development config, by construction.
export const applicationEnvironments = pgTable('application_environments', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull(),
  envType: varchar('env_type', { length: 20 }).notNull(),
  envName: varchar('env_name', { length: 100 }).notNull(),
  allowedOrigins: jsonb('allowed_origins').notNull().default([]),
  allowedIps: jsonb('allowed_ips').notNull().default([]),
  rateLimitWindowMs: integer('rate_limit_window_ms'),
  rateLimitMaxRequests: integer('rate_limit_max_requests'),
  usageLimit: integer('usage_limit'),
  webhookUrl: text('webhook_url'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_application_environments_application').on(table.applicationId),
  index('idx_application_environments_status').on(table.applicationId, table.status),
]);
