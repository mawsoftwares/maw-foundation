import { pgTable, text, serial, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const socialAccountLinks = pgTable('social_account_links', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  providerId: text('provider_id').notNull(),
  linkedAt: timestamp('linked_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('social_account_links_provider_unique').on(table.provider, table.providerId),
  index('idx_social_account_links_user').on(table.userId),
  index('idx_social_account_links_provider').on(table.provider, table.providerId),
]);
