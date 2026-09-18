import type { PgClient } from '@mawsoftwares/database';
import type { User } from '../../domain/entities/User';

import type { ListUsersQueryDto } from '../../application/dto';

// Repository contract only. The Foundation template's PgUserRepository (and
// its matching migration) assumed a dedicated `users` table with split
// first_name/last_name columns and a real deleted_at soft-delete column —
// this project doesn't use that table. It shares the `users` table with
// auth instead (single `name` column, `account_status` in place of
// deleted_at), so the concrete implementation lives in
// ../../../users-from-auth-pg.ts (AuthSchemaUsersRepository), built directly
// against that Drizzle schema rather than the template's raw-SQL repository.
export interface IUsersRepository {
  create(user: Omit<User, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<User>;
  findById(id: string, tenantId: string, client?: PgClient): Promise<User | null>;
  findByEmail(tenantId: string, email: string, client?: PgClient): Promise<User | null>;
  findByPhone(tenantId: string, phone: string, client?: PgClient): Promise<User | null>;
  searchUsers(tenantId: string, query: ListUsersQueryDto): Promise<{ items: User[]; total: number }>;
  updateUser(id: string, tenantId: string, updates: Partial<User>, client?: PgClient): Promise<User | null>;
  softDelete(id: string, tenantId: string, client?: PgClient): Promise<boolean>;
  existsByEmail(tenantId: string, email: string, client?: PgClient): Promise<boolean>;
  existsByPhone(tenantId: string, phone: string, client?: PgClient): Promise<boolean>;
}
