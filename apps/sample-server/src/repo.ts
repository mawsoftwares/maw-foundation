import { hashPassword } from '@maw/auth-core';
import type { IRefreshTokenStore, RefreshRecord } from '@maw/auth-core';
import type { TenantRolePolicy } from '@maw/rbac-core';

/**
 * In-memory data layer for the proof server — so it runs with ZERO external deps (no
 * Postgres needed). It sits behind the same shapes a real repo would (`IRefreshTokenStore`
 * from auth-core; a role→permission matrix from rbac-core), so swapping in the Postgres
 * schema in `migrations/` is a drop-in change at the composition root — exactly the
 * "contracts over implementations" rule. See migrations/001_auth_rbac.sql for the real DDL.
 */

export interface UserRow {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly role: string;
  readonly audience: string;
  readonly passwordHash: string;
  readonly scopeId: string | null;
}

const TENANT = 'demo-tenant';

/** Tenant config: which modules are enabled (license ∪ feature flags). */
export const ENABLED_MODULES = ['admin', 'reports', 'orders', 'inventory', 'billing'];

/**
 * The tenant's editable role→permission matrix (what Control Center / an admin screen
 * writes). `manager` can view reports; `clerk` cannot — that difference is what the
 * gated /reports route demonstrates.
 */
export const TENANT_ROLE_POLICY: TenantRolePolicy = {
  owner: ['users.manage', 'settings.write', 'reports.view', 'reports.export', 'orders.view', 'orders.create', 'orders.edit', 'inventory.view', 'inventory.adjust', 'billing.create', 'payments.create'],
  manager: ['reports.view', 'reports.export', 'orders.view', 'orders.create', 'orders.edit', 'billing.create', 'payments.create'],
  clerk: ['orders.view', 'orders.create', 'billing.create', 'payments.create'],
};

/** Seeded users. Password for everyone: "password123". */
export const USERS: readonly UserRow[] = [
  { id: 'u-owner', tenantId: TENANT, email: 'owner@demo.test', role: 'owner', audience: 'admin', passwordHash: hashPassword('password123'), scopeId: null },
  { id: 'u-manager', tenantId: TENANT, email: 'manager@demo.test', role: 'manager', audience: 'admin', passwordHash: hashPassword('password123'), scopeId: 'plant-1' },
  { id: 'u-clerk', tenantId: TENANT, email: 'clerk@demo.test', role: 'clerk', audience: 'operator', passwordHash: hashPassword('password123'), scopeId: 'plant-1' },
];

export function findUserByEmail(email: string): UserRow | undefined {
  return USERS.find((u) => u.email === email.toLowerCase());
}

export function findUserById(id: string): UserRow | undefined {
  return USERS.find((u) => u.id === id);
}

/** In-memory refresh-token store implementing the auth-core port. */
export class MemoryRefreshStore implements IRefreshTokenStore {
  private readonly rows = new Map<string, RefreshRecord>();
  async save(record: RefreshRecord): Promise<void> {
    this.rows.set(record.tokenHash, record);
  }
  async find(tokenHash: string): Promise<RefreshRecord | null> {
    return this.rows.get(tokenHash) ?? null;
  }
  async revoke(tokenHash: string): Promise<void> {
    const row = this.rows.get(tokenHash);
    if (row !== undefined) this.rows.set(tokenHash, { ...row, revokedAt: new Date() });
  }
}
