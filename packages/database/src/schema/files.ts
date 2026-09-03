import { pgTable, uuid, varchar, bigint, timestamp, index } from 'drizzle-orm/pg-core';

export const fileMetadata = pgTable('file_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 64 }).notNull(),
  storageKey: varchar('storage_key', { length: 1024 }).notNull().unique(),
  originalName: varchar('original_name', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 128 }).notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  uploadedBy: varchar('uploaded_by', { length: 64 }),
  url: varchar('url', { length: 2048 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
}, (table) => [
  index('idx_file_metadata_tenant').on(table.tenantId),
  index('idx_file_metadata_key').on(table.storageKey),
]);
