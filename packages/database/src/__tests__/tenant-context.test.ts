import { describe, it, expect } from 'vitest';
import { setTenantContext, withTenantTransaction } from '../tenant/index';
import { MockPgPool } from '../testing/index';

describe('setTenantContext', () => {
  it('uses set_config with a bind parameter, transaction-local (SET LOCAL cannot take parameters)', async () => {
    const pool = new MockPgPool();
    const client = await pool.connect();
    await setTenantContext(client, 'acme');
    const call = pool.calls[0];
    expect(call?.sql).toBe("SELECT set_config('app.tenant_id', $1, true)");
    expect(call?.params).toEqual(['acme']);
  });

  it('rejects an empty tenantId', async () => {
    const pool = new MockPgPool();
    await expect(setTenantContext(await pool.connect(), '  ')).rejects.toThrow(/non-empty tenantId/);
  });
});

describe('withTenantTransaction', () => {
  it('sets the tenant right after BEGIN and before the callback runs, then commits', async () => {
    const pool = new MockPgPool();
    const result = await withTenantTransaction(pool, 'acme', async (client) => {
      await client.query('SELECT 1');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(pool.calls.map((c) => c.sql.split(' ')[0])).toEqual(['BEGIN', 'SELECT', 'SELECT', 'COMMIT']);
    expect(pool.calls[1]?.sql).toContain('set_config');
  });

  it('rolls back and rethrows when the callback fails', async () => {
    const pool = new MockPgPool();
    await expect(withTenantTransaction(pool, 'acme', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(pool.assertCalled(/^ROLLBACK/)).toBeDefined();
    expect(pool.assertCalled(/^COMMIT/)).toBeUndefined();
  });

  it('does not run the callback when the tenantId is empty', async () => {
    const pool = new MockPgPool();
    let ran = false;
    await expect(withTenantTransaction(pool, '', async () => { ran = true; })).rejects.toThrow(/non-empty tenantId/);
    expect(ran).toBe(false);
  });
});
