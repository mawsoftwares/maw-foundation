import type { PgPool } from '@maw/database';
import type { IRefreshTokenStore, RefreshRecord } from '@maw/auth-core';
import type { TenantRolePolicy } from '@maw/rbac-core';

/**
 * Postgres-backed data layer — same interface shapes as the in-memory repo, but reads/
 * writes go to real tables (created by `migrations/001_auth_rbac.sql`). The user store
 * itself lives in `auth-stores-pg.ts` alongside the other auth ports.
 */

export async function loadTenantRolePolicy(pool: PgPool, tenantId: string): Promise<TenantRolePolicy> {
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
  constructor(private readonly pool: PgPool) {}

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
