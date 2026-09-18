import { pgTable, text, serial, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Admin-manageable navigation menu — see apps/sample-server/migrations/013_menu_items.up.sql
// for the rationale (DB-backed so it's editable without a code deploy).
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  path: text('path'),
  icon: text('icon'),
  parentId: integer('parent_id'),
  permission: text('permission'),
  featureFlag: text('feature_flag'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
