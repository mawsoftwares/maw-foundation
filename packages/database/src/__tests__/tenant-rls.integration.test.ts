import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PgTransactionPool } from '../types';
import { createTestPool } from '../testing/index';
import { appRoleStatements, forceRlsStatements, withTenantTransaction } from '../tenant/index';

/**
 * Real Postgres proof that tenant isolation works end to end: set TEST_DATABASE_URL to a throwaway
 * database where the user may create roles and tables (e.g. a local superuser). Skipped otherwise.
 */
const URL = process.env.TEST_DATABASE_URL;
const TABLE = 'maw_rls_probe';
const ROLE = 'maw_rls_probe_app';

describe.skipIf(URL === undefined)('tenant isolation on a real database', () => {
  let pool: PgTransactionPool;

  beforeAll(async () => {
    pool = await createTestPool();
    await pool.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await pool.query(`CREATE TABLE ${TABLE} (id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, note TEXT NOT NULL)`);
    for (const sql of forceRlsStatements([TABLE])) await pool.query(sql);
    await pool.query(`CREATE POLICY probe_tenant_isolation ON ${TABLE} USING (tenant_id = current_setting('app.tenant_id', true))`);
    for (const sql of appRoleStatements({ role: ROLE, tables: [TABLE] })) await pool.query(sql);
    await pool.query(`INSERT INTO ${TABLE} (tenant_id, note) VALUES ('t1', 'a1'), ('t1', 'a2'), ('t2', 'b1')`);
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await pool.query(`DROP OWNED BY ${ROLE}`);
    await pool.query(`DROP ROLE IF EXISTS ${ROLE}`);
    await (pool as unknown as { end(): Promise<void> }).end();
  });

  const notesAs = (tenant: string): Promise<string[]> =>
    withTenantTransaction(pool, tenant, async (client) => {
      await client.query(`SET LOCAL ROLE ${ROLE}`);
      // No tenant filter on purpose: isolation must come from the database.
      const { rows } = await client.query<{ note: string }>(`SELECT note FROM ${TABLE} ORDER BY note`);
      return rows.map((r) => r.note);
    });

  it('a non-bypassing role sees only the tenant set for the transaction, with no WHERE clause', async () => {
    expect(await notesAs('t1')).toEqual(['a1', 'a2']);
    expect(await notesAs('t2')).toEqual(['b1']);
    expect(await notesAs('unknown')).toEqual([]);
  });

  it('the tenant does not leak to the next transaction on a pooled connection', async () => {
    await notesAs('t1');
    const { rows } = await pool.query<{ v: string | null }>(`SELECT current_setting('app.tenant_id', true) AS v`);
    expect(rows[0]?.v ?? '').toBe('');
  });

  it('the app role cannot write another tenant\'s rows', async () => {
    await expect(
      withTenantTransaction(pool, 't1', async (client) => {
        await client.query(`SET LOCAL ROLE ${ROLE}`);
        await client.query(`INSERT INTO ${TABLE} (tenant_id, note) VALUES ('t2', 'sneaky')`);
      }),
    ).rejects.toThrow(/row-level security/i);
  });

  it('the role was created without superuser or bypass rights', async () => {
    const { rows } = await pool.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = '${ROLE}'`,
    );
    expect(rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  });
});
