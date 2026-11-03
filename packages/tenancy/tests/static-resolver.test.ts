import { describe, it, expect } from 'vitest';
import { StaticTenantResolver, CompositeTenantResolver, type ITenantResolver } from '../src/index';

describe('StaticTenantResolver', () => {
  it('resolves the configured tenant', async () => {
    const resolver = new StaticTenantResolver({ tenantId: 'acme', tenantStatus: 'active' });
    expect(await resolver.resolve({})).toEqual({ tenantId: 'acme', tenantStatus: 'active' });
  });

  it('ignores every caller-controlled input', async () => {
    const resolver = new StaticTenantResolver({ tenantId: 'acme' });
    const forged = await resolver.resolve({
      hostname: 'evil.example.com',
      tenantHeader: 'other',
      pathSegment: 'other',
      jwtClaims: { tenantId: 'other' },
    });
    expect(forged?.tenantId).toBe('acme');
  });

  it('returns a copy so callers cannot change the configured tenant', async () => {
    const resolver = new StaticTenantResolver({ tenantId: 'acme' });
    const first = await resolver.resolve({});
    expect(first).not.toBeNull();
    (first as { tenantId: string }).tenantId = 'tampered';
    expect((await resolver.resolve({}))?.tenantId).toBe('acme');
  });

  it('rejects an empty tenantId at construction', () => {
    expect(() => new StaticTenantResolver({ tenantId: '  ' })).toThrow(/non-empty tenantId/);
  });

  it('works as the fallback of a CompositeTenantResolver', async () => {
    const none: ITenantResolver = { resolve: () => Promise.resolve(null) };
    const composite = new CompositeTenantResolver([none, new StaticTenantResolver({ tenantId: 'acme' })]);
    expect((await composite.resolve({ hostname: 'localhost' }))?.tenantId).toBe('acme');
  });
});
