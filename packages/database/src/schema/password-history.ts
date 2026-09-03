import { pgTable, bigserial, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const passwordHistory = pgTable('password_history', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
