import { describe, it, expect } from 'vitest';
import type { PgClient, PgTransactionPool, QueryResult } from '../types';
import { createTenantScopedPool } from '../tenant/index';

interface Call { readonly sql: string; readonly params?: unknown[] }

/** Records every statement and release on a fake pool, with per-connection ids. */
function fakePool(failOn?: RegExp) {
  const calls: Call[] = [];
  const events: string[] = [];
  let nextId = 1;
  const result: QueryResult<Record<string, unknown>> = { rows: [], rowCount: 0 };
  const run = async (sql: string, params?: unknown[]): Promise<QueryResult<Record<string, unknown>>> => {
    calls.push({ sql, params });
    if (failOn?.test(sql)) throw new Error('boom');
    return result;
  };
  const pool: PgTransactionPool & { end(): Promise<void> } = {
    query: run as PgTransactionPool['query'],
    connect: (): Promise<PgClient> => {
      const id = nextId++;
      events.push(`connect#${id}`);
      const client = {
        query: run as PgClient['query'],
        release: (err?: unknown): void => { events.push(`release#${id}${err === undefined ? '' : ':destroy'}`); },
      };
      return Promise.resolve(client);
    },
    end: () => Promise.resolve(),
  };
  return { pool, calls, events };
}

const SET = "SELECT set_config('app.tenant_id', $1, false)";
const CLEAR = "SELECT set_config('app.tenant_id', '', false)";

describe('createTenantScopedPool', () => {
  it('query(): sets the tenant, runs the statement, clears the tenant, releases', async () => {
    const { pool, calls, events } = fakePool();
    const scoped = createTenantScopedPool(pool, { tenantId: () => 'acme' });
    await scoped.query('SELECT 1', [7]);
    expect(calls.map((c) => c.sql)).toEqual([SET, 'SELECT 1', CLEAR]);
    expect(calls[0]?.params).toEqual(['acme']);
    expect(calls[1]?.params).toEqual([7]);
    expect(events).toEqual(['connect#1', 'release#1']);
  });

  it('query(): with no tenant in context runs the statement unscoped, on the plain pool', async () => {
    const { pool, calls, events } = fakePool();
    const scoped = createTenantScopedPool(pool, { tenantId: () => undefined });
    await scoped.query('SELECT 1');
    expect(calls.map((c) => c.sql)).toEqual(['SELECT 1']);
    expect(events).toEqual([]);
  });

  it('query(): reads the tenant at call time, so concurrent callers get their own', async () => {
    const { pool, calls } = fakePool();
    let current: string | undefined = 't1';
    const scoped = createTenantScopedPool(pool, { tenantId: () => current });
    await scoped.query('SELECT 1');
    current = 't2';
    await scoped.query('SELECT 2');
    expect(calls.filter((c) => c.sql === SET).map((c) => c.params?.[0])).toEqual(['t1', 't2']);
  });

  it('query(): a failing statement still clears the tenant and releases the connection, and rethrows', async () => {
    const { pool, calls, events } = fakePool(/^SELECT bad/);
    const scoped = createTenantScopedPool(pool, { tenantId: () => 'acme' });
    await expect(scoped.query('SELECT bad')).rejects.toThrow('boom');
    expect(calls.map((c) => c.sql)).toEqual([SET, 'SELECT bad', CLEAR]);
    expect(events).toEqual(['connect#1', 'release#1']);
  });

  it('query(): if setting the tenant fails, nothing else runs and the connection is released', async () => {
    const { pool, calls, events } = fakePool(/set_config\('app.tenant_id', \$1/);
    const scoped = createTenantScopedPool(pool, { tenantId: () => 'acme' });
    await expect(scoped.query('SELECT 1')).rejects.toThrow('boom');
    expect(calls.map((c) => c.sql)).not.toContain('SELECT 1');
    expect(events.at(-1)).toMatch(/^release#1/);
  });

  it('connect(): the client has the tenant set while checked out and cleared on release', async () => {
    const { pool, calls, events } = fakePool();
    const scoped = createTenantScopedPool(pool, { tenantId: () => 'acme' });
    const client = await scoped.connect();
    await client.query('BEGIN');
    await client.query('SELECT 1');
    await client.query('COMMIT');
    client.release();
    await new Promise<void>((r) => setImmediate(r));
    expect(calls.map((c) => c.sql)).toEqual([SET, 'BEGIN', 'SELECT 1', 'COMMIT', CLEAR]);
    expect(events).toEqual(['connect#1', 'release#1']);
  });

  it('connect(): release(err) destroys the connection without trying to clear', async () => {
    const { pool, calls, events } = fakePool();
    const scoped = createTenantScopedPool(pool, { tenantId: () => 'acme' });
    const client = await scoped.connect();
    (client.release as (e?: unknown) => void)(new Error('broken'));
    expect(calls.map((c) => c.sql)).toEqual([SET]);
    expect(events).toEqual(['connect#1', 'release#1:destroy']);
  });

  it('connect(): with no tenant returns the plain client', async () => {
    const { pool, calls } = fakePool();
    const scoped = createTenantScopedPool(pool, { tenantId: () => undefined });
    const client = await scoped.connect();
    client.release();
    expect(calls).toEqual([]);
  });

  it('passes other pool members through and rejects callback-style queries', async () => {
    const { pool } = fakePool();
    const scoped = createTenantScopedPool(pool, { tenantId: () => 'acme' });
    await expect(scoped.end()).resolves.toBeUndefined();
    const callbackStyle = scoped.query as unknown as (sql: string, cb: () => void) => Promise<unknown>;
    await expect(callbackStyle('SELECT 1', () => undefined)).rejects.toThrow(/callback-style/);
  });
});
