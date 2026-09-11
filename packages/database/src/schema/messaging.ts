import { pgTable, uuid, text, varchar, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';

// Messaging: Email/SMS/WhatsApp template management, provider credentials
// ("Masters"), and a send-attempt audit trail — ported from the servicemate
// project's message-templates / email-templates / integration-credentials /
// message-send-logs features into maw-foundation's conventions.
//
// Kept as two template tables (mirroring servicemate): messagingEmailTemplates
// is the richer, email-specific table (default from/to/cc/bcc, variables
// hint); messagingTemplates covers SMS and WhatsApp, which only need a body.

export const messagingEmailTemplates = pgTable('messaging_email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: varchar('identifier', { length: 150 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  fromAddress: varchar('from_address', { length: 255 }),
  toAddress: text('to_address'),
  ccAddress: text('cc_address'),
  bccAddress: text('bcc_address'),
  variables: jsonb('variables').notNull().default([]),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const messagingTemplates = pgTable('messaging_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  channel: varchar('channel', { length: 20 }).notNull(),
  identifier: varchar('identifier', { length: 150 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  body: text('body').notNull(),
  variables: jsonb('variables').notNull().default([]),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  unique('messaging_templates_channel_identifier_key').on(table.channel, table.identifier),
  index('idx_messaging_templates_channel').on(table.channel),
]);

// One row per channel ("Email Master" / "SMS Master" / "WhatsApp Master").
// Sensitive fields inside `config` (pass/apiKey/authToken/accessToken) are
// stored as AES-256-GCM ciphertext strings (AesEncryptionService format,
// "v1:iv:enc:tag") — never plaintext — and are masked as "********" whenever
// the API returns this row.
export const messagingCredentials = pgTable('messaging_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  channel: varchar('channel', { length: 20 }).notNull().unique(),
  provider: varchar('provider', { length: 50 }).notNull(),
  name: varchar('name', { length: 150 }).notNull(),
  config: jsonb('config').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const messagingSendLogs = pgTable('messaging_send_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  channel: varchar('channel', { length: 20 }).notNull(),
  identifier: varchar('identifier', { length: 150 }),
  templateId: uuid('template_id'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  toAddress: text('to_address'),
  ccAddress: text('cc_address'),
  bccAddress: text('bcc_address'),
  renderedSubject: text('rendered_subject'),
  renderedBody: text('rendered_body'),
  errorMessage: text('error_message'),
  providerResponse: jsonb('provider_response'),
  relatedEntityType: varchar('related_entity_type', { length: 100 }),
  relatedEntityId: varchar('related_entity_id', { length: 100 }),
  sentBy: text('sent_by'),
  sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_messaging_send_logs_channel').on(table.channel),
  index('idx_messaging_send_logs_created').on(table.createdAt),
]);
