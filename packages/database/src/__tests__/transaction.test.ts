import { describe, it, expect } from 'vitest';
import { withTransaction, withSavepoint } from '../transaction/index';
import { MockPgPool } from '../testing/index';

describe('withTransaction', () => {
  it('commits on success', async () => {
    const pool = new MockPgPool();
    const result = await withTransaction(pool, async (client) => {
      await client.query('INSERT INTO t VALUES ($1)', ['x']);
      return 'done';
    });

    expect(result).toBe('done');
    expect(pool.assertCalled(/^BEGIN/)).toBeDefined();
    expect(pool.assertCalled(/^COMMIT/)).toBeDefined();
    expect(pool.assertCalled(/^INSERT/)).toBeDefined();
  });

  it('rolls back on error', async () => {
    const pool = new MockPgPool();
    await expect(
      withTransaction(pool, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(pool.assertCalled(/^BEGIN/)).toBeDefined();
    expect(pool.assertCalled(/^ROLLBACK/)).toBeDefined();
    expect(pool.assertCalled(/^COMMIT/)).toBeUndefined();
  });

  it('sets isolation level', async () => {
    const pool = new MockPgPool();
    await withTransaction(pool, async () => {}, { isolationLevel: 'SERIALIZABLE' });
    expect(pool.assertCalled(/ISOLATION LEVEL SERIALIZABLE/)).toBeDefined();
  });

  it('sets read only', async () => {
    const pool = new MockPgPool();
    await withTransaction(pool, async () => {}, { readOnly: true });
    expect(pool.assertCalled(/READ ONLY/)).toBeDefined();
  });
});

describe('withSavepoint', () => {
  it('releases on success', async () => {
    const pool = new MockPgPool();
    const client = await pool.connect();
    const result = await withSavepoint(client, 'sp1', async () => 'ok');

    expect(result).toBe('ok');
    expect(pool.assertCalled(/^SAVEPOINT sp1/)).toBeDefined();
    expect(pool.assertCalled(/^RELEASE SAVEPOINT sp1/)).toBeDefined();
  });

  it('rolls back savepoint on error', async () => {
    const pool = new MockPgPool();
    const client = await pool.connect();
    await expect(
      withSavepoint(client, 'sp2', async () => {
        throw new Error('inner fail');
      }),
    ).rejects.toThrow('inner fail');

    expect(pool.assertCalled(/^ROLLBACK TO SAVEPOINT sp2/)).toBeDefined();
  });

  it('sanitizes savepoint name', async () => {
    const pool = new MockPgPool();
    const client = await pool.connect();
    await withSavepoint(client, 'my-save.point!', async () => {});
    expect(pool.assertCalled(/^SAVEPOINT my_save_point_/)).toBeDefined();
  });
});
