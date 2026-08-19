import { describe, it, expect } from 'vitest';
import { resolveEffectiveAccess } from './resolver';
import { EXAMPLE_RBAC } from './example-vocab';
import type { UserAccessContext } from './types';

function ctx(over: Partial<UserAccessContext>): UserAccessContext {
  return {
    userId: 'u1',
    tenantId: 't1',
    baseRole: 'viewer',
    grantedCapabilities: [],
    enabledModules: ['admin', 'reports', 'orders', 'inventory', 'billing'],
    subscriptionActive: true,
    ...over,
  };
}

describe('resolveEffectiveAccess', () => {
  it('superuser (owner) passes every permission', () => {
    const access = resolveEffectiveAccess(ctx({ baseRole: 'owner' }), EXAMPLE_RBAC);
    expect(access.can('anything.at-all')).toBe(true);
    expect(access.can('reports.view')).toBe(true);
  });

  it('grants a role exactly the permissions its active modules allow', () => {
    const access = resolveEffectiveAccess(ctx({ baseRole: 'clerk' }), EXAMPLE_RBAC);
    expect(access.can('orders.create')).toBe(true);
    expect(access.can('billing.create')).toBe(true);
    expect(access.can('reports.view')).toBe(false); // clerk has no reports module
    expect(access.can('users.manage')).toBe(false);
  });

  it('drives nav via active capabilities', () => {
    const access = resolveEffectiveAccess(ctx({ baseRole: 'manager' }), EXAMPLE_RBAC);
    expect([...access.capabilities].sort()).toEqual(['billing', 'orders', 'reports']);
  });

  it('hides a capability when its module is not enabled (licence/feature-flag gate)', () => {
    const access = resolveEffectiveAccess(
      ctx({ baseRole: 'manager', enabledModules: ['orders', 'billing'] }), // reports disabled
      EXAMPLE_RBAC,
    );
    expect(access.capabilities).not.toContain('reports');
    expect(access.can('reports.view')).toBe(false);
    expect(access.can('orders.create')).toBe(true);
  });

  it('revokes everything when the subscription is inactive', () => {
    const access = resolveEffectiveAccess(
      ctx({ baseRole: 'manager', subscriptionActive: false }),
      EXAMPLE_RBAC,
    );
    expect(access.capabilities).toEqual([]);
    expect(access.can('orders.create')).toBe(false);
  });

  it('applies a per-tenant matrix override (Control-Center edit)', () => {
    const access = resolveEffectiveAccess(
      ctx({ baseRole: 'clerk', rolePermissions: { clerk: ['reports.view'] } }),
      EXAMPLE_RBAC,
    );
    expect(access.can('reports.view')).toBe(true);
    expect(access.can('orders.create')).toBe(false); // matrix narrowed clerk to reports only
  });

  it('honors a work-as capability grant without changing the base role', () => {
    const access = resolveEffectiveAccess(
      ctx({ baseRole: 'viewer', grantedCapabilities: ['billing'] }),
      EXAMPLE_RBAC,
    );
    expect(access.can('billing.create')).toBe(true);
    expect(access.can('inventory.view')).toBe(true); // viewer's own base perm still holds
  });

  it('ABAC: conditional grant passes only when the scope predicate matches (plant-scoping)', () => {
    const inOwnPlant = resolveEffectiveAccess(
      ctx({ baseRole: 'viewer', scope: { plantId: 'p1', ownPlantId: 'p1' } }),
      EXAMPLE_RBAC,
    );
    expect(inOwnPlant.can('reports.export')).toBe(true);

    const otherPlant = resolveEffectiveAccess(
      ctx({ baseRole: 'viewer', scope: { plantId: 'p2', ownPlantId: 'p1' } }),
      EXAMPLE_RBAC,
    );
    expect(otherPlant.can('reports.export')).toBe(false);

    // Call-site context can supply the fact instead of the bound scope.
    const viaCallSite = resolveEffectiveAccess(
      ctx({ baseRole: 'viewer', scope: { ownPlantId: 'p1' } }),
      EXAMPLE_RBAC,
    );
    expect(viaCallSite.can('reports.export', { plantId: 'p1' })).toBe(true);
    expect(viaCallSite.can('reports.export', { plantId: 'p9' })).toBe(false);
  });
});
