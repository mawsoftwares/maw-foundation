import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, ne, sql } from 'drizzle-orm';
import type { PgClient } from '@mawsoftwares/database';
import type { IUsersRepository, User } from '@mawsoftwares/users';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import { AccountStatus } from '@mawsoftwares/sdk/security/AccountStatus';

type UsersRow = typeof schema.users.$inferSelect;

function splitName(name: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = (name ?? '').trim();
  if (trimmed.length === 0) return { firstName: 'User', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? 'User',
    lastName: parts.slice(1).join(' '),
  };
}

function joinName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function toModuleUser(row: UsersRow): User {
  const { firstName, lastName } = splitName(row.name);
  const status = row.accountStatus as AccountStatusValue;
  return {
    id: row.id,
    tenantId: row.tenantId,
    firstName,
    lastName,
    email: row.email,
    phone: row.phone ?? undefined,
    passwordHash: row.passwordHash,
    avatar: row.avatar ?? undefined,
    role: row.role,
    status,
    emailVerifiedAt: row.emailVerified ? row.createdAt.toISOString() : undefined,
    phoneVerifiedAt: row.phoneVerified ? row.createdAt.toISOString() : undefined,
    lastLoginAt: row.lastLoginAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: status === AccountStatus.DISABLED ? row.updatedAt.toISOString() : null,
  };
}

const notDisabled = ne(schema.users.accountStatus, 'DISABLED');

export class AuthSchemaUsersRepository implements IUsersRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>, _client?: PgClient): Promise<User> {
    const rows = await this.db
      .insert(schema.users)
      .values({
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role?.trim() || 'viewer',
        audience: 'admin',
        passwordHash: user.passwordHash,
        name: joinName(user.firstName, user.lastName),
        avatar: user.avatar ?? null,
        accountStatus: user.status,
        emailVerified: user.emailVerifiedAt != null,
        phone: user.phone ?? null,
        phoneVerified: user.phoneVerifiedAt != null,
      })
      .returning();
    return toModuleUser(rows[0]!);
  }

  async findById(id: string, tenantId: string, _client?: PgClient): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, tenantId), notDisabled))
      .limit(1);
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async findByEmail(tenantId: string, email: string, _client?: PgClient): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.tenantId, tenantId), sql`LOWER(${schema.users.email}) = LOWER(${email})`, notDisabled))
      .limit(1);
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async findByPhone(tenantId: string, phone: string, _client?: PgClient): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.tenantId, tenantId), eq(schema.users.phone, phone), notDisabled))
      .limit(1);
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async searchUsers(tenantId: string, _query?: unknown, options?: unknown): Promise<User[]> {
    const opts = (options ?? {}) as { limit?: number; offset?: number };
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.tenantId, tenantId), notDisabled))
      .orderBy(schema.users.createdAt)
      .limit(limit)
      .offset(offset);
    return rows.map(toModuleUser);
  }

  async updateUser(id: string, tenantId: string, updates: Partial<User>, _client?: PgClient): Promise<User | null> {
    const existing = await this.findById(id, tenantId);
    if (existing === null) return null;

    const firstName = updates.firstName ?? existing.firstName;
    const lastName = updates.lastName ?? existing.lastName;
    const email = updates.email ?? existing.email;
    const phone = updates.phone !== undefined ? updates.phone : existing.phone;
    const passwordHash = updates.passwordHash ?? existing.passwordHash;
    const avatar = updates.avatar !== undefined ? updates.avatar : existing.avatar;
    const role = updates.role ?? existing.role ?? 'viewer';
    const status = updates.status ?? existing.status;
    const emailVerified = updates.emailVerifiedAt !== undefined
      ? updates.emailVerifiedAt != null
      : existing.emailVerifiedAt != null;
    const phoneVerified = updates.phoneVerifiedAt !== undefined
      ? updates.phoneVerifiedAt != null
      : existing.phoneVerifiedAt != null;
    const lastLoginAt = updates.lastLoginAt !== undefined ? updates.lastLoginAt : existing.lastLoginAt;

    const rows = await this.db
      .update(schema.users)
      .set({
        name: joinName(firstName, lastName),
        email,
        phone: phone ?? null,
        passwordHash,
        avatar: avatar ?? null,
        role,
        accountStatus: status,
        emailVerified,
        phoneVerified,
        lastLoginAt: lastLoginAt ? new Date(lastLoginAt) : null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, tenantId)))
      .returning();
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async softDelete(id: string, tenantId: string, _client?: PgClient): Promise<boolean> {
    const rows = await this.db
      .update(schema.users)
      .set({ accountStatus: 'DISABLED', updatedAt: new Date() })
      .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, tenantId), notDisabled))
      .returning({ id: schema.users.id });
    return rows.length > 0;
  }

  async existsByEmail(tenantId: string, email: string, _client?: PgClient): Promise<boolean> {
    return (await this.findByEmail(tenantId, email)) !== null;
  }

  async existsByPhone(tenantId: string, phone: string, _client?: PgClient): Promise<boolean> {
    return (await this.findByPhone(tenantId, phone)) !== null;
  }
}
