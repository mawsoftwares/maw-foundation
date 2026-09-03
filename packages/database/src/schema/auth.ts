import { pgTable, text, boolean, timestamp, bigserial, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { jsonb } from 'drizzle-orm/pg-core';

export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  deviceId: text('device_id'),
  deviceInfo: jsonb('device_info'),
  refreshTokenHash: text('refresh_token_hash'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true, mode: 'date' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_user_sessions_user').on(table.tenantId, table.userId),
  index('idx_user_sessions_expiry').on(table.expiresAt),
]);

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_email_verification_user').on(table.userId),
]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_password_reset_user').on(table.userId),
]);

export const mfaChallenges = pgTable('mfa_challenges', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  rememberMe: boolean('remember_me').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const mfaSecrets = pgTable('mfa_secrets', {
  userId: text('user_id').primaryKey(),
  encryptedSecret: text('encrypted_secret').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const mfaBackupCodes = pgTable('mfa_backup_codes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull(),
  codeHash: text('code_hash').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  uniqueIndex('mfa_backup_codes_user_code_unique').on(table.userId, table.codeHash),
  index('idx_mfa_backup_codes_user').on(table.userId),
]);

export const loginAttempts = pgTable('login_attempts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  attemptKey: text('attempt_key').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true, mode: 'date' }).notNull(),
  success: boolean('success').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  failureReason: text('failure_reason'),
}, (table) => [
  index('idx_login_attempts_key').on(table.attemptKey, table.attemptedAt),
]);
