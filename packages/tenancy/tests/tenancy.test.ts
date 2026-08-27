import { describe, it, expect } from 'vitest';
import {
  createTenantContextHolder,
  isTenantActive,
  requireActiveTenant,
  type Tenant,
  type TenantContext,
} from '../src/index';

const makeTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: 't1',
  name: 'Acme Corp',
  slug: 'acme',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('@mawsoftwares/tenancy — TenantContextHolder', () => {
  it('should start with null context', () => {
    const holder = createTenantContextHolder();
    expect(holder.get()).toBeNull();
  });

  it('should set and get context', () => {
    const holder = createTenantContextHolder();
    const ctx: TenantContext = { tenantId: 't1', tenantName: 'Acme' };
    holder.set(ctx);
    expect(holder.get()).toEqual(ctx);
  });

  it('should clear context', () => {
    const holder = createTenantContextHolder();
    holder.set({ tenantId: 't1' });
    holder.clear();
    expect(holder.get()).toBeNull();
  });

  it('should scope context inside run()', () => {
    const holder = createTenantContextHolder();
    const outer: TenantContext = { tenantId: 'outer' };
    const inner: TenantContext = { tenantId: 'inner' };

    holder.set(outer);
    const result = holder.run(inner, () => {
      expect(holder.get()?.tenantId).toBe('inner');
      return 'done';
    });

    expect(result).toBe('done');
    expect(holder.get()?.tenantId).toBe('outer');
  });

  it('should restore context even if run() throws', () => {
    const holder = createTenantContextHolder();
    holder.set({ tenantId: 'original' });

    expect(() => {
      holder.run({ tenantId: 'boom' }, () => {
        throw new Error('fail');
      });
    }).toThrow('fail');

    expect(holder.get()?.tenantId).toBe('original');
  });
});

describe('@mawsoftwares/tenancy — isTenantActive', () => {
  it('should return true for active tenants', () => {
    expect(isTenantActive(makeTenant({ status: 'active' }))).toBe(true);
  });

  it('should return false for suspended tenants', () => {
    expect(isTenantActive(makeTenant({ status: 'suspended' }))).toBe(false);
  });
});

describe('@mawsoftwares/tenancy — requireActiveTenant', () => {
  it('should not throw for active tenants', () => {
    expect(() => requireActiveTenant(makeTenant())).not.toThrow();
  });

  it('should throw for inactive tenants', () => {
    expect(() => requireActiveTenant(makeTenant({ status: 'inactive' }))).toThrow(
      'not active',
    );
  });
});
