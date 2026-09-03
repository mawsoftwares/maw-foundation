import { pgTable, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  actionUrl: text('action_url'),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_notifications_user_tenant').on(table.userId, table.tenantId, table.createdAt),
  index('idx_notifications_unread').on(table.userId, table.tenantId),
]);

export const notificationTemplates = pgTable('notification_templates', {
  id: text('id').primaryKey(),
  channel: text('channel').notNull(),
  name: text('name').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  html: text('html'),
  variables: jsonb('variables'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_notification_templates_channel').on(table.channel),
]);
