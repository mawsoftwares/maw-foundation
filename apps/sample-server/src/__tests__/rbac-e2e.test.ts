import { describe, it, expect } from 'vitest';
import {
  resolveEffectiveAccess,
  type RbacConfig,
  type UserAccessContext,
} from '@mawsoftwares/rbac-core';
import { signAccessToken, verifyAccessToken, type AuthClaims } from '@mawsoftwares/auth-core';

const JWT_SECRET = 'test-secret-that-is-long-enough-for-tests-only';

const RBAC_CONFIG: RbacConfig = {
  capabilities: ['admin', 'reports', 'orders'],
  capabilityPermissions: {
    admin: ['users.manage', 'settings.write'],
    reports: ['reports.view', 'reports.export'],
    orders: ['orders.view', 'orders.create', 'orders.edit'],
  },
  superuserRoles: ['super_admin'],
  defaultRolePolicy: {
    owner: ['users.manage', 'settings.write', 'reports.view', 'reports.export', 'orders.view', 'orders.create', 'orders.edit'],
    manager: ['reports.view', 'orders.view', 'orders.create'],
    clerk: ['orders.view', 'orders.create'],
  },
};

function makeCtx(overrides: Partial<UserAccessContext>): UserAccessContext {
  return {
    userId: 'u-1',
    tenantId: 't-1',
    baseRole: 'owner',
    grantedCapabilities: [],
    enabledModules: ['admin', 'reports', 'orders'],
    subscriptionActive: true,
    ...overrides,
  };
}

describe('RBAC Security E2E', () => {
  describe('Static RBAC — resolveEffectiveAccess', () => {
    it('owner gets all configured permissions', () => {
      const ctx = makeCtx({ baseRole: 'owner' });
      const access = resolveEffectiveAccess(ctx, RBAC_CONFIG);
      expect(access.can('users.manage')).toBe(true);
      expect(access.can('reports.view')).toBe(true);
      expect(access.can('orders.create')).toBe(true);
    });

    it('clerk cannot access admin-only permissions', () => {
      const ctx = makeCtx({ baseRole: 'clerk' });
      const access = resolveEffectiveAccess(ctx, RBAC_CONFIG);
      expect(access.can('users.manage')).toBe(false);
      expect(access.can('reports.view')).toBe(false);
      expect(access.can('orders.view')).toBe(true);
    });

    it('unknown role gets no permissions', () => {
      const ctx = makeCtx({ baseRole: 'unknown' });
      const access = resolveEffectiveAccess(ctx, RBAC_CONFIG);
      expect(access.can('users.manage')).toBe(false);
      expect(access.can('orders.view')).toBe(false);
      expect(access.capabilities.length).toBe(0);
    });

    it('super_admin bypasses all checks', () => {
      const ctx = makeCtx({ baseRole: 'super_admin' });
      const access = resolveEffectiveAccess(ctx, RBAC_CONFIG);
      expect(access.can('users.manage')).toBe(true);
      expect(access.can('anything.at.all')).toBe(true);
    });

    it('disabled module removes its permissions', () => {
      const ctx = makeCtx({ baseRole: 'owner', enabledModules: ['orders'] });
      const access = resolveEffectiveAccess(ctx, RBAC_CONFIG);
      expect(access.can('orders.view')).toBe(true);
      expect(access.can('reports.view')).toBe(false);
      expect(access.can('users.manage')).toBe(false);
    });

    it('inactive subscription blocks all permissions', () => {
      const ctx = makeCtx({ baseRole: 'owner', subscriptionActive: false });
      const access = resolveEffectiveAccess(ctx, RBAC_CONFIG);
      expect(access.capabilities.length).toBe(0);
    });
  });

  describe('Audience Gating via JWT Claims', () => {
    it('token carries audience claim', async () => {
      const claims: AuthClaims = {
        userId: 'u-1',
        tenantId: 't-1',
        role: 'owner',
        audience: 'admin',
      };
      const token = signAccessToken(claims, JWT_SECRET, { issueJti: true });
      const verified = await verifyAccessToken(token, JWT_SECRET);
      expect(verified.audience).toBe('admin');
    });

    it('operator audience is distinct from admin', async () => {
      const adminClaims: AuthClaims = {
        userId: 'u-1',
        tenantId: 't-1',
        role: 'owner',
        audience: 'admin',
      };
      const operatorClaims: AuthClaims = {
        userId: 'u-2',
        tenantId: 't-1',
        role: 'clerk',
        audience: 'operator',
      };
      const adminToken = signAccessToken(adminClaims, JWT_SECRET);
      const operatorToken = signAccessToken(operatorClaims, JWT_SECRET);

      const admin = await verifyAccessToken(adminToken, JWT_SECRET);
      const operator = await verifyAccessToken(operatorToken, JWT_SECRET);

      expect(admin.audience).toBe('admin');
      expect(operator.audience).toBe('operator');
      expect(admin.audience).not.toBe(operator.audience);
    });
  });

  describe('ABAC — scopeId in Claims', () => {
    it('scopeId is carried in JWT when provided', async () => {
      const claims: AuthClaims = {
        userId: 'u-1',
        tenantId: 't-1',
        role: 'manager',
        audience: 'admin',
        scopeId: 'plant-1',
      };
      const token = signAccessToken(claims, JWT_SECRET);
      const verified = await verifyAccessToken(token, JWT_SECRET);
      expect(verified.scopeId).toBe('plant-1');
    });

    it('scopeId is undefined when not provided', async () => {
      const claims: AuthClaims = {
        userId: 'u-1',
        tenantId: 't-1',
        role: 'owner',
        audience: 'admin',
      };
      const token = signAccessToken(claims, JWT_SECRET);
      const verified = await verifyAccessToken(token, JWT_SECRET);
      expect(verified.scopeId).toBeUndefined();
    });
  });
});
