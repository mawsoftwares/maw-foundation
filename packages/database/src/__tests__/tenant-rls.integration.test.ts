import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { PgTransactionPool } from '../types';
import { createTestPool } from '../testing/index';
import { appRoleStatements, createTenantScopedPool, forceRlsStatements, withTenantTransaction } from '../tenant/index';

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

describe.skipIf(URL === undefined)('createTenantScopedPool on a real database', () => {
  const TABLE2 = 'maw_rls_scoped_probe';
  const ROLE2 = 'maw_rls_scoped_app';
  let owner: PgTransactionPool;
  let appPool: PgTransactionPool & { end(): Promise<void> };
  let current: string | undefined;

  beforeAll(async () => {
    owner = await createTestPool();
    await owner.query(`DROP TABLE IF EXISTS ${TABLE2}`);
    await owner.query(`CREATE TABLE ${TABLE2} (id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, note TEXT NOT NULL)`);
    for (const sql of forceRlsStatements([TABLE2])) await owner.query(sql);
    await owner.query(`CREATE POLICY scoped_probe ON ${TABLE2} USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true))`);
    for (const sql of appRoleStatements({ role: ROLE2, tables: [TABLE2] })) await owner.query(sql);
    await owner.query(`INSERT INTO ${TABLE2} (tenant_id, note) VALUES ('t1', 'a1'), ('t1', 'a2'), ('t2', 'b1')`);
    // Application pool: same server, every connection assumes the non-bypassing role.
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: URL, options: `-c role=${ROLE2}`, max: 2 });
    appPool = createTenantScopedPool(pool as unknown as PgTransactionPool & { end(): Promise<void> }, { tenantId: () => current });
  });

  afterAll(async () => {
    await appPool.end();
    await owner.query(`DROP TABLE IF EXISTS ${TABLE2}`);
    await owner.query(`DROP OWNED BY ${ROLE2}`);
    await owner.query(`DROP ROLE IF EXISTS ${ROLE2}`);
    await (owner as unknown as { end(): Promise<void> }).end();
  });

  const notes = async (): Promise<string[]> =>
    (await appPool.query<{ note: string }>(`SELECT note FROM ${TABLE2} ORDER BY note`)).rows.map((r) => r.note);

  it('each statement sees only the current tenant, with no WHERE clause', async () => {
    current = 't1';
    expect(await notes()).toEqual(['a1', 'a2']);
    current = 't2';
    expect(await notes()).toEqual(['b1']);
  });

  it('with no tenant in context the application role sees nothing (fail closed)', async () => {
    current = undefined;
    expect(await notes()).toEqual([]);
  });

  it('a checked-out client (ORM transaction) is scoped, and the tenant is gone after release', async () => {
    current = 't1';
    const client = await appPool.connect();
    await client.query('BEGIN');
    expect((await client.query<{ note: string }>(`SELECT note FROM ${TABLE2} ORDER BY note`)).rows).toHaveLength(2);
    await client.query('COMMIT');
    client.release();
    await new Promise<void>((r) => setTimeout(r, 50));
    current = undefined;
    expect(await notes()).toEqual([]);
  });

  it('cannot write another tenant\'s rows, and a failed statement does not leak the tenant', async () => {
    current = 't1';
    await expect(appPool.query(`INSERT INTO ${TABLE2} (tenant_id, note) VALUES ('t2', 'sneaky')`)).rejects.toThrow(/row-level security/i);
    current = undefined;
    expect(await notes()).toEqual([]);
  });
});
