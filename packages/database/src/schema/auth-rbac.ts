import { pgTable, text, bigserial, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const tenantRolePermissions = pgTable('tenant_role_permissions', {
  tenantId: text('tenant_id').notNull(),
  role: text('role').notNull(),
  permission: text('permission').notNull(),
}, (table) => [
  uniqueIndex('tenant_role_permissions_unique').on(table.tenantId, table.role, table.permission),
]);

export const refreshTokens = pgTable('refresh_tokens', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  deviceId: text('device_id'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
});
