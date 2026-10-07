import { describe, expect, it } from 'vitest';
import { canManageRole, filterVisibleRoles, getRoleLevel, outranks } from './role-hierarchy';

const roles = [
  { code: 'super_admin', level: 100 },
  { code: 'owner', level: 90 },
  { code: 'admin', level: 80 },
  { code: 'admin_b', level: 80 },
  { code: 'manager', level: 60 },
  { code: 'viewer', level: 20 },
];

describe('role hierarchy (strict ladder)', () => {
  it('super_admin sees every role below it', () => {
    expect(filterVisibleRoles(roles, 'super_admin').map((r) => r.code)).toEqual(['owner', 'admin', 'admin_b', 'manager', 'viewer']);
  });

  it('admin cannot see super_admin or owner, nor same-level roles', () => {
    expect(filterVisibleRoles(roles, 'admin').map((r) => r.code)).toEqual(['manager', 'viewer']);
    expect(canManageRole(roles, 'admin', 'super_admin')).toBe(false);
    expect(canManageRole(roles, 'admin', 'admin_b')).toBe(false);
    expect(canManageRole(roles, 'admin', 'admin')).toBe(false);
  });

  it('lowest role sees nothing', () => {
    expect(filterVisibleRoles(roles, 'viewer')).toEqual([]);
  });

  it('unknown actor sees nothing; unknown target is lowest', () => {
    expect(filterVisibleRoles(roles, 'ghost')).toEqual([]);
    expect(canManageRole(roles, undefined, 'viewer')).toBe(false);
    expect(canManageRole(roles, 'viewer', 'ghost')).toBe(true);
  });

  it('matches codes case-insensitively and exposes level lookups', () => {
    expect(getRoleLevel(roles, 'ADMIN')).toBe(80);
    expect(outranks(80, 60)).toBe(true);
    expect(outranks(60, 60)).toBe(false);
  });
});
