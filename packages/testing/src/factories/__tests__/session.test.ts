import { describe, it, expect } from 'vitest';
import { createTestSession } from '../session';
import { DEFAULT_TENANT_ID } from '@mawsoftwares/sdk/contracts/identity';

describe('createTestSession', () => {
  it('returns sensible defaults', () => {
    const session = createTestSession();
    expect(session.userId).toMatch(/^user_/);
    expect(session.tenantId).toBe(DEFAULT_TENANT_ID);
    expect(session.role).toBe('admin');
    expect(session.entitlements).toEqual([]);
  });

  it('accepts overrides', () => {
    const session = createTestSession({ role: 'viewer', tenantId: 'tenant-99' });
    expect(session.role).toBe('viewer');
    expect(session.tenantId).toBe('tenant-99');
    expect(session.userId).toMatch(/^user_/);
  });

  it('generates unique userIds across calls', () => {
    const a = createTestSession();
    const b = createTestSession();
    expect(a.userId).not.toBe(b.userId);
  });
});
