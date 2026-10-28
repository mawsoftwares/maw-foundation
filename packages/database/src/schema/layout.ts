import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, bigserial } from 'drizzle-orm/pg-core';

/**
 * Application layout configuration — see apps/sample-server/migrations/033_tenant_layout.up.sql.
 *
 * One row per (tenant, scope, scope_id). Today only scope = 'tenant' / scope_id = '' is used; 'project' and 'user'
 * are reserved for project-level overrides and per-user preferences so they need no schema change later.
 * Each client deployment owns its database, so rows carry no cross-database references; `tenant_id` is a plain
 * opaque id like every other tenant-scoped table.
 *
 * `draft` is what Layout Studio saves; `published` is the only copy end users ever render. `jsonb` holds a
 * versioned StoredLayoutConfig from @mawsoftwares/layout (the database does not interpret it).
 */
export const tenantLayout = pgTable(
  'tenant_layout',
  {
    tenantId: text('tenant_id').notNull(),
    scope: text('scope').notNull().default('tenant'),
    scopeId: text('scope_id').notNull().default(''),
    draft: jsonb('draft'),
    draftUpdatedBy: text('draft_updated_by'),
    draftUpdatedAt: timestamp('draft_updated_at', { withTimezone: true, mode: 'date' }),
    published: jsonb('published'),
    publishedRevision: integer('published_revision'),
    publishedBy: text('published_by'),
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.scope, t.scopeId] })],
);

/**
 * Append-only history of everything that was published. Rollback never edits or deletes: it publishes an older
 * revision's config again as a new revision (`action = 'rollback'`, `source_revision` = the one restored).
 */
export const tenantLayoutRevisions = pgTable(
  'tenant_layout_revision',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenantId: text('tenant_id').notNull(),
    scope: text('scope').notNull().default('tenant'),
    scopeId: text('scope_id').notNull().default(''),
    revision: integer('revision').notNull(),
    config: jsonb('config').notNull(),
    /** StoredLayoutConfig.version at the time, so old rows can be migrated on read. */
    configVersion: integer('config_version').notNull(),
    action: text('action').notNull(),
    sourceRevision: integer('source_revision'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tenant_layout_revision_uq').on(t.tenantId, t.scope, t.scopeId, t.revision),
    index('tenant_layout_revision_lookup').on(t.tenantId, t.scope, t.scopeId, t.createdAt),
  ],
);
