import { pgTable, uuid, text, varchar, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// The fixed catalogue of shared services the platform can offer (Email, SMS,
// OTP, WhatsApp, file storage, push, auth, payment gateway, webhooks). Global
// — not tenant-scoped — since it describes what the platform is capable of,
// not any one tenant's configuration of it. Only Email ships enabled in the
// MVP; the rest register with status 'coming_soon'.
export const serviceCatalogue = pgTable('service_catalogue', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('coming_soon'),
  configSchema: jsonb('config_schema'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

// Providers available for a given service (e.g. smtp/ses/sendgrid/resend for
// EMAIL). isDefault marks the provider used when no application-specific
// provider_configurations row overrides it.
export const serviceProviders = pgTable('service_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceCode: varchar('service_code', { length: 50 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_service_providers_service').on(table.serviceCode),
]);

// Encrypted provider configuration (SMTP host/user/pass, SES/SendGrid API
// keys, etc.). scope='shared' is the common Mindsatwork-wide config used by
// approved applications by default; scope='application' overrides it for one
// application (optionally further narrowed by environment at the
// application_services level). configEncrypted holds AES-256-GCM ciphertext
// of the JSON config blob — never returned decrypted by any API.
export const providerConfigurations = pgTable('provider_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceCode: varchar('service_code', { length: 50 }).notNull(),
  providerId: uuid('provider_id').notNull(),
  scope: varchar('scope', { length: 20 }).notNull().default('shared'),
  applicationId: uuid('application_id'),
  name: varchar('name', { length: 200 }).notNull(),
  configEncrypted: text('config_encrypted').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_provider_configurations_service').on(table.serviceCode),
  index('idx_provider_configurations_application').on(table.applicationId),
]);

// Per-environment enable/disable of a service, with an optional pointer to
// the provider_configurations row it should use (null = fall back to the
// service's shared default provider) and optional per-environment overrides
// of rate/usage limits.
export const applicationServices = pgTable('application_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  environmentId: uuid('environment_id').notNull(),
  serviceCode: varchar('service_code', { length: 50 }).notNull(),
  enabled: boolean('enabled').notNull().default(false),
  providerConfigurationId: uuid('provider_configuration_id'),
  rateLimitWindowMs: integer('rate_limit_window_ms'),
  rateLimitMaxRequests: integer('rate_limit_max_requests'),
  usageLimit: integer('usage_limit'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  index('idx_application_services_environment').on(table.environmentId),
  index('idx_application_services_service').on(table.serviceCode),
]);
