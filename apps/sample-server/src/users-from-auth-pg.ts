import type { PgPool, PgClient } from '@mawsoftwares/database';
import type { IUsersRepository, User } from '@mawsoftwares/users';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import { AccountStatus } from '@mawsoftwares/sdk/security/AccountStatus';

/**
 * Users-module port (`IUsersRepository`) over the sample-server auth `users` table.
 * Auth (login/register/reset) and `/api/v1/users` share one Postgres table.
 */

const USER_COLUMNS = `id, tenant_id, email, role, audience, password_hash, scope_id, name, avatar,
  account_status, email_verified, mfa_enabled, last_login_at, phone, phone_verified,
  created_at, updated_at`;

interface AuthUserRow {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  audience: string;
  password_hash: string;
  scope_id: string | null;
  name: string | null;
  avatar: string | null;
  account_status: string;
  email_verified: boolean;
  mfa_enabled: boolean;
  last_login_at: Date | null;
  phone: string | null;
  phone_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

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

function toModuleUser(row: AuthUserRow): User {
  const { firstName, lastName } = splitName(row.name);
  const status = row.account_status as AccountStatusValue;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName,
    lastName,
    email: row.email,
    phone: row.phone ?? undefined,
    passwordHash: row.password_hash,
    avatar: row.avatar ?? undefined,
    role: row.role,
    status,
    emailVerifiedAt: row.email_verified ? row.created_at.toISOString() : undefined,
    phoneVerifiedAt: row.phone_verified ? row.created_at.toISOString() : undefined,
    lastLoginAt: row.last_login_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: status === AccountStatus.DISABLED ? row.updated_at.toISOString() : null,
  };
}

function clientOrPool(pool: PgPool, client?: PgClient): PgPool | PgClient {
  return client ?? pool;
}

export class AuthSchemaUsersRepository implements IUsersRepository {
  constructor(private readonly pool: PgPool) {}

  async create(user: Omit<User, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<User> {
    const db = clientOrPool(this.pool, client);
    const { rows } = await db.query<AuthUserRow>(
      `INSERT INTO users (
         id, tenant_id, email, role, audience, password_hash, scope_id, name, avatar,
         account_status, email_verified, phone, phone_verified
       ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8, $9, $10, $11, $12)
       RETURNING ${USER_COLUMNS}`,
      [
        user.id,
        user.tenantId,
        user.email,
        user.role?.trim() || 'viewer',
        'admin',
        user.passwordHash,
        joinName(user.firstName, user.lastName),
        user.avatar ?? null,
        user.status,
        user.emailVerifiedAt != null,
        user.phone ?? null,
        user.phoneVerifiedAt != null,
      ],
    );
    return toModuleUser(rows[0]!);
  }

  async findById(id: string, tenantId: string, client?: PgClient): Promise<User | null> {
    const db = clientOrPool(this.pool, client);
    const { rows } = await db.query<AuthUserRow>(
      `SELECT ${USER_COLUMNS} FROM users
       WHERE id = $1 AND tenant_id = $2 AND account_status <> 'DISABLED'
       LIMIT 1`,
      [id, tenantId],
    );
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async findByEmail(tenantId: string, email: string, client?: PgClient): Promise<User | null> {
    const db = clientOrPool(this.pool, client);
    const { rows } = await db.query<AuthUserRow>(
      `SELECT ${USER_COLUMNS} FROM users
       WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) AND account_status <> 'DISABLED'
       LIMIT 1`,
      [tenantId, email],
    );
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async findByPhone(tenantId: string, phone: string, client?: PgClient): Promise<User | null> {
    const db = clientOrPool(this.pool, client);
    const { rows } = await db.query<AuthUserRow>(
      `SELECT ${USER_COLUMNS} FROM users
       WHERE tenant_id = $1 AND phone = $2 AND account_status <> 'DISABLED'
       LIMIT 1`,
      [tenantId, phone],
    );
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async searchUsers(tenantId: string, _query?: unknown, options?: unknown): Promise<User[]> {
    const opts = (options ?? {}) as { limit?: number; offset?: number };
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    const { rows } = await this.pool.query<AuthUserRow>(
      `SELECT ${USER_COLUMNS} FROM users
       WHERE tenant_id = $1 AND account_status <> 'DISABLED'
       ORDER BY created_at
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset],
    );
    return rows.map(toModuleUser);
  }

  async updateUser(id: string, tenantId: string, updates: Partial<User>, client?: PgClient): Promise<User | null> {
    const existing = await this.findById(id, tenantId, client);
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

    const db = clientOrPool(this.pool, client);
    const { rows } = await db.query<AuthUserRow>(
      `UPDATE users SET
         name = $3,
         email = $4,
         phone = $5,
         password_hash = $6,
         avatar = $7,
         role = $8,
         account_status = $9,
         email_verified = $10,
         phone_verified = $11,
         last_login_at = $12,
         updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING ${USER_COLUMNS}`,
      [
        id,
        tenantId,
        joinName(firstName, lastName),
        email,
        phone ?? null,
        passwordHash,
        avatar ?? null,
        role,
        status,
        emailVerified,
        phoneVerified,
        lastLoginAt ? new Date(lastLoginAt) : null,
      ],
    );
    return rows[0] !== undefined ? toModuleUser(rows[0]) : null;
  }

  async softDelete(id: string, tenantId: string, client?: PgClient): Promise<boolean> {
    const db = clientOrPool(this.pool, client);
    const result = await db.query(
      `UPDATE users SET account_status = 'DISABLED', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND account_status <> 'DISABLED'`,
      [id, tenantId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async existsByEmail(tenantId: string, email: string, client?: PgClient): Promise<boolean> {
    return (await this.findByEmail(tenantId, email, client)) !== null;
  }

  async existsByPhone(tenantId: string, phone: string, client?: PgClient): Promise<boolean> {
    return (await this.findByPhone(tenantId, phone, client)) !== null;
  }
}
