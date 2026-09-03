import type { DrizzleDb } from '@mawsoftwares/database';
import { schema } from '@mawsoftwares/database';
import { eq, and, isNull } from 'drizzle-orm';
import type { IRefreshTokenStore, RefreshRecord } from '@mawsoftwares/auth-core';
import type { TenantRolePolicy } from '@mawsoftwares/rbac-core';

export async function loadTenantRolePolicy(db: DrizzleDb, tenantId: string): Promise<TenantRolePolicy> {
  const rows = await db
    .select({ role: schema.tenantRolePermissions.role, permission: schema.tenantRolePermissions.permission })
    .from(schema.tenantRolePermissions)
    .where(eq(schema.tenantRolePermissions.tenantId, tenantId));
  const policy: Record<string, string[]> = {};
  for (const row of rows) {
    (policy[row.role] ??= []).push(row.permission);
  }
  return policy;
}

export class PgRefreshStore implements IRefreshTokenStore {
  constructor(private readonly db: DrizzleDb) {}

  async save(record: RefreshRecord): Promise<void> {
    await this.db.insert(schema.refreshTokens).values({
      tenantId: record.tenantId,
      userId: record.userId,
      tokenHash: record.tokenHash,
      deviceId: record.deviceId,
      expiresAt: new Date(record.expiresAt),
      revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
    });
  }

  async find(tokenHash: string): Promise<RefreshRecord | null> {
    const rows = await this.db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, tokenHash));
    const r = rows[0];
    if (r === undefined) return null;
    return {
      tenantId: r.tenantId,
      userId: r.userId,
      tokenHash: r.tokenHash,
      deviceId: r.deviceId,
      expiresAt: r.expiresAt,
      revokedAt: r.revokedAt,
    };
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.refreshTokens.tokenHash, tokenHash), isNull(schema.refreshTokens.revokedAt)));
  }
}
