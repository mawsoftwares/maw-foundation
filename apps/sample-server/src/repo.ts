import { hashPassword } from '@maw/auth-core';
import type { IRefreshTokenStore, RefreshRecord } from '@maw/auth-core';
import { AccountStatus } from '@maw/sdk';
import type { TenantRolePolicy } from '@maw/rbac-core';
import type { IUserRepository, UserRecord, CreateUserInput } from '@maw/sdk/contracts/IUserRepository';
import { randomUUID } from 'node:crypto';

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

/** The single tenant the sample seeds; real products resolve this per request. */
export const DEMO_TENANT = 'demo-tenant';

const TENANT = DEMO_TENANT;

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
  { id: 'u-superadmin', tenantId: TENANT, email: 'superadmin@demo.test', role: 'super_admin', audience: 'admin', passwordHash: hashPassword('password123'), scopeId: null },
  { id: 'u-owner', tenantId: TENANT, email: 'owner@demo.test', role: 'owner', audience: 'admin', passwordHash: hashPassword('password123'), scopeId: null },
  { id: 'u-manager', tenantId: TENANT, email: 'manager@demo.test', role: 'manager', audience: 'admin', passwordHash: hashPassword('password123'), scopeId: 'plant-1' },
  { id: 'u-clerk', tenantId: TENANT, email: 'clerk@demo.test', role: 'clerk', audience: 'operator', passwordHash: hashPassword('password123'), scopeId: 'plant-1' },
];

/** In-memory user repository implementing the SDK port. */
export class MemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, UserRecord>();

  constructor(seedUsers?: readonly UserRow[]) {
    if (seedUsers) {
      const now = new Date().toISOString();
      for (const u of seedUsers) {
        this.users.set(u.id, {
          id: u.id,
          tenantId: u.tenantId,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          audience: u.audience,
          scopeId: u.scopeId,
          accountStatus: AccountStatus.ACTIVE,
          emailVerified: true,
          mfaEnabled: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async listByTenant(tenantId: string): Promise<UserRecord[]> {
    const result: UserRecord[] = [];
    for (const u of this.users.values()) {
      if (u.tenantId === tenantId) result.push(u);
    }
    return result;
  }

  async findByEmail(tenantId: string, email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.tenantId === tenantId && u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date().toISOString();
    const record: UserRecord = {
      id: randomUUID(),
      tenantId: input.tenantId,
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      name: input.name,
      audience: input.audience ?? 'admin',
      scopeId: input.scopeId ?? null,
      accountStatus: input.accountStatus,
      emailVerified: false,
      mfaEnabled: false,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(record.id, record);
    return record;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, passwordHash, updatedAt: new Date().toISOString() });
  }

  async updateStatus(userId: string, status: UserRecord['accountStatus']): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, accountStatus: status, updatedAt: new Date().toISOString() });
  }

  async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, emailVerified: verified, updatedAt: new Date().toISOString() });
  }

  async updateLastLogin(userId: string, timestamp: string): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, lastLoginAt: timestamp, updatedAt: new Date().toISOString() });
  }

  async updateMfaEnabled(userId: string, enabled: boolean): Promise<void> {
    const u = this.users.get(userId);
    if (u) this.users.set(userId, { ...u, mfaEnabled: enabled, updatedAt: new Date().toISOString() });
  }
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
