import { pgTable, text, varchar, uuid, integer, boolean, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const masters = pgTable('masters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull(),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  isSystem: boolean('is_system').notNull().default(false),
  allowCustomValues: boolean('allow_custom_values').notNull().default(true),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 64 }),
  updatedBy: varchar('updated_by', { length: 64 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull().default(1),
}, (table) => [
  uniqueIndex('masters_tenant_code_unique').on(table.tenantId, table.code),
  index('idx_masters_tenant_id').on(table.tenantId),
  index('idx_masters_code').on(table.tenantId, table.code),
  index('idx_masters_status').on(table.tenantId, table.status),
]);

export const masterFields = pgTable('master_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  masterId: uuid('master_id').notNull(),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  dataType: varchar('data_type', { length: 20 }).notNull().default('string'),
  isRequired: boolean('is_required').notNull().default(false),
  isUnique: boolean('is_unique').notNull().default(false),
  isSearchable: boolean('is_searchable').notNull().default(false),
  isFilterable: boolean('is_filterable').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  defaultValue: text('default_value'),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 64 }),
  updatedBy: varchar('updated_by', { length: 64 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  uniqueIndex('master_fields_master_code_unique').on(table.masterId, table.code),
  index('idx_master_fields_master_id').on(table.masterId),
]);

export const masterValues = pgTable('master_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  masterId: uuid('master_id').notNull(),
  code: varchar('code', { length: 64 }).notNull(),
  label: varchar('label', { length: 500 }).notNull(),
  value: text('value'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  createdBy: varchar('created_by', { length: 64 }),
  updatedBy: varchar('updated_by', { length: 64 }),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull().default(1),
}, (table) => [
  uniqueIndex('master_values_master_code_unique').on(table.masterId, table.code),
  index('idx_master_values_master_id').on(table.masterId),
  index('idx_master_values_active').on(table.masterId, table.isActive, table.sortOrder),
  index('idx_master_values_code').on(table.masterId, table.code),
]);
