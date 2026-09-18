import { pgTable, uuid, text, varchar, timestamp } from 'drizzle-orm/pg-core';

// Application credentials for HMAC-signed Service Gateway requests.
// clientSecretEncrypted holds the AES-256-GCM ciphertext (AesEncryptionService
// format) of the raw secret — never a one-way hash, because HMAC verification
// needs the original value to recompute the expected signature. The raw
// secret itself is shown to the admin exactly once at creation time and is
// never persisted anywhere in plaintext, never returned by any later API
// call, and never logged (see LogRedactor field list).
export const applicationCredentials = pgTable('application_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  environmentId: uuid('environment_id').notNull(),
  clientIdPublic: varchar('client_id_public', { length: 64 }).notNull(),
  clientSecretEncrypted: text('client_secret_encrypted').notNull(),
  secretLastFour: varchar('secret_last_four', { length: 8 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
  gracePeriodEndsAt: timestamp('grace_period_ends_at', { withTimezone: true, mode: 'date' }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }),
  rotatedFromCredentialId: uuid('rotated_from_credential_id'),
  createdBy: text('created_by'),
  revokedBy: text('revoked_by'),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
