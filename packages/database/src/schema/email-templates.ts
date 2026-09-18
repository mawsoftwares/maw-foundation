import { pgTable, uuid, text, varchar, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// Centrally-managed email templates, scoped to one application (applicationId
// set) or global (applicationId null), optionally further scoped to one
// environment (environment null = applies to all environments of the
// application/global scope). The live content lives in
// email_template_versions — this row only tracks identity and which version
// is currently active, so template changes are versioned and updates never
// silently break an application already sending against an older version.
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  applicationId: uuid('application_id'),
  environment: varchar('environment', { length: 20 }),
  activeVersionId: uuid('active_version_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_email_templates_application').on(table.applicationId),
  index('idx_email_templates_code').on(table.code),
]);

// One immutable version of a template's content. required_variables mirrors
// the shape @mawsoftwares/communication's TemplateVariable already uses
// ({ name, required, defaultValue }), so validation can reuse
// validateTemplateVariables from packages/communication unchanged.
export const emailTemplateVersions = pgTable('email_template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull(),
  version: integer('version').notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  htmlBody: text('html_body'),
  textBody: text('text_body'),
  requiredVariables: jsonb('required_variables').notNull().default([]),
  defaultValues: jsonb('default_values').notNull().default({}),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_email_template_versions_template').on(table.templateId),
]);
