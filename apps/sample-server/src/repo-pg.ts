import type pg from 'pg';
import type { IRefreshTokenStore, RefreshRecord } from '@maw/auth-core';
import type { TenantRolePolicy } from '@maw/rbac-core';
import type { UserRow } from './repo';

/**
 * Postgres-backed data layer — same interface shapes as the in-memory repo, but reads/
 * writes go to real tables (created by `migrations/001_auth_rbac.sql`).
 */

export function createPgUserRepo(pool: pg.Pool) {
  return {
    async findByEmail(email: string): Promise<UserRow | undefined> {
      const { rows } = await pool.query<{
        id: string; tenant_id: string; email: string; role: string;
        audience: string; password_hash: string; scope_id: string | null;
      }>(
        'SELECT id, tenant_id, email, role, audience, password_hash, scope_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [email],
      );
      const r = rows[0];
      if (r === undefined) return undefined;
      return {
        id: r.id,
        tenantId: r.tenant_id,
        email: r.email,
        role: r.role,
        audience: r.audience,
        passwordHash: r.password_hash,
        scopeId: r.scope_id,
      };
    },

    async findById(id: string): Promise<UserRow | undefined> {
      const { rows } = await pool.query<{
        id: string; tenant_id: string; email: string; role: string;
        audience: string; password_hash: string; scope_id: string | null;
      }>(
        'SELECT id, tenant_id, email, role, audience, password_hash, scope_id FROM users WHERE id = $1 LIMIT 1',
        [id],
      );
      const r = rows[0];
      if (r === undefined) return undefined;
      return {
        id: r.id,
        tenantId: r.tenant_id,
        email: r.email,
        role: r.role,
        audience: r.audience,
        passwordHash: r.password_hash,
        scopeId: r.scope_id,
      };
    },
  };
}

export async function loadTenantRolePolicy(pool: pg.Pool, tenantId: string): Promise<TenantRolePolicy> {
  const { rows } = await pool.query<{ role: string; permission: string }>(
    'SELECT role, permission FROM tenant_role_permissions WHERE tenant_id = $1',
    [tenantId],
  );
  const policy: Record<string, string[]> = {};
  for (const row of rows) {
    (policy[row.role] ??= []).push(row.permission);
  }
  return policy;
}

export class PgRefreshStore implements IRefreshTokenStore {
  constructor(private readonly pool: pg.Pool) {}

  async save(record: RefreshRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO refresh_tokens (tenant_id, user_id, token_hash, device_id, expires_at, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [record.tenantId, record.userId, record.tokenHash, record.deviceId, record.expiresAt, record.revokedAt],
    );
  }

  async find(tokenHash: string): Promise<RefreshRecord | null> {
    const { rows } = await this.pool.query<{
      tenant_id: string; user_id: string; token_hash: string;
      device_id: string | null; expires_at: Date; revoked_at: Date | null;
    }>(
      'SELECT tenant_id, user_id, token_hash, device_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash],
    );
    const r = rows[0];
    if (r === undefined) return null;
    return {
      tenantId: r.tenant_id,
      userId: r.user_id,
      tokenHash: r.token_hash,
      deviceId: r.device_id,
      expiresAt: new Date(r.expires_at),
      revokedAt: r.revoked_at != null ? new Date(r.revoked_at) : null,
    };
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.pool.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
      [tokenHash],
    );
  }
}
