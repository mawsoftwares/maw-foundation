import { pgTable, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  audience: text('audience').notNull().default('admin'),
  passwordHash: text('password_hash').notNull(),
  scopeId: text('scope_id'),
  name: text('name'),
  accountStatus: text('account_status').notNull().default('ACTIVE'),
  emailVerified: boolean('email_verified').notNull().default(true),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  phone: text('phone'),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('users_tenant_email_idx').on(table.tenantId, table.email),
]);
