import { describe, it, expect } from 'vitest';
import { appRoleStatements, assertSafeIdentifier, forceRlsStatements } from '../tenant/index';

describe('appRoleStatements', () => {
  it('creates a non-bypassing login role and grants data access to the listed tables only', () => {
    const sql = appRoleStatements({ role: 'maw_app', tables: ['users', 'service_requests'] }).join('\n');
    expect(sql).toContain('NOSUPERUSER NOBYPASSRLS');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."users", "public"."service_requests" TO "maw_app"');
    expect(sql).not.toMatch(/PASSWORD/i);
  });

  it('omits the table grant when no tables are given', () => {
    const sql = appRoleStatements({ role: 'maw_app', tables: [] }).join('\n');
    expect(sql).not.toContain('DELETE ON');
  });

  it.each([
    ['role', { role: 'x"; DROP TABLE users;--', tables: [] }],
    ['table', { role: 'maw_app', tables: ['users; DROP TABLE x'] }],
    ['schema', { role: 'maw_app', tables: [], schema: 'Public' }],
  ])('rejects an unsafe %s name', (_what, options) => {
    expect(() => appRoleStatements(options)).toThrow(/Unsafe/);
  });
});

describe('forceRlsStatements', () => {
  it('enables then forces RLS for each table', () => {
    expect(forceRlsStatements(['users', 'tenants'])).toEqual([
      'ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."users" FORCE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "public"."tenants" FORCE ROW LEVEL SECURITY',
    ]);
  });
});

describe('assertSafeIdentifier', () => {
  it('accepts snake_case and rejects everything else', () => {
    expect(assertSafeIdentifier('service_requests', 'table')).toBe('service_requests');
    for (const bad of ['', 'A', '1abc', 'a-b', 'a b', 'a'.repeat(64), 'a;b']) {
      expect(() => assertSafeIdentifier(bad, 'table')).toThrow(/Unsafe/);
    }
  });
});
