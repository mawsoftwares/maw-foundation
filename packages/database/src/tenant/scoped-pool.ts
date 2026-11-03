import type { PgClient, PgTransactionPool, QueryResult } from '../types';
import { TENANT_SETTING } from './rls';

export interface TenantScopedPoolOptions {
  /**
   * Returns the tenant of the code that is running right now (typically read from an
   * `AsyncLocalStorage` set by the tenant middleware), or undefined when there is none.
   */
  readonly tenantId: () => string | undefined;
}

type QueryArgs = readonly [text: unknown, values?: unknown];

function isCallback(value: unknown): boolean {
  return typeof value === 'function';
}

async function setTenant(client: PgClient, tenantId: string): Promise<void> {
  await client.query(`SELECT set_config('${TENANT_SETTING}', $1, false)`, [tenantId]);
}

async function clearTenant(client: PgClient): Promise<void> {
  await client.query(`SELECT set_config('${TENANT_SETTING}', '', false)`);
}

/**
 * Wraps a `pg.Pool` so that every statement runs with `app.tenant_id` set to the current tenant, which is
 * what Row Level Security policies read. Use it for the application's runtime pool, connected as a role that
 * cannot bypass RLS (see `appRoleStatements`); then a query that forgets its tenant filter still cannot see
 * another tenant's rows.
 *
 * - `pool.query(...)`: acquires a connection, sets the tenant for the session, runs the statement, clears
 *   the tenant, releases. The tenant is cleared on every release, so a pooled connection never carries a
 *   tenant to the next caller.
 * - `pool.connect()`: the returned client has the tenant set for as long as it is checked out (so ORM
 *   transactions started on it are covered) and cleared on `release()`.
 * - With no tenant in context the statement runs unscoped: an RLS-protected table returns no rows for the
 *   application role (fail closed). Code that legitimately works across tenants (migrations, seeding,
 *   background maintenance) should use a separate privileged pool or run inside a tenant context.
 *
 * The callback overloads of `pg` are not supported (promises only). All other pool members are passed
 * through unchanged.
 */
export function createTenantScopedPool<P extends PgTransactionPool>(pool: P, options: TenantScopedPoolOptions): P {
  const rawQuery = pool.query.bind(pool) as (...args: QueryArgs) => Promise<QueryResult<Record<string, unknown>>>;
  const rawConnect = pool.connect.bind(pool);

  async function scopedConnect(): Promise<PgClient> {
    const client = await rawConnect();
    const tenantId = options.tenantId();
    if (tenantId === undefined) return client;
    try {
      await setTenant(client, tenantId);
    } catch (error) {
      (client.release as (err?: unknown) => void)(error); // destroy the connection: its state is unknown
      throw error;
    }
    return new Proxy(client, {
      get(target, prop, receiver) {
        if (prop === 'release') {
          return (err?: unknown): void => {
            if (err !== undefined) { (target.release as (e?: unknown) => void)(err); return; }
            clearTenant(target).then(
              () => { target.release(); },
              (clearError: unknown) => { (target.release as (e?: unknown) => void)(clearError); },
            );
          };
        }
        const value: unknown = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }

  async function scopedQuery(...args: QueryArgs): Promise<QueryResult<Record<string, unknown>>> {
    if (args.slice(1).some(isCallback)) {
      throw new Error('createTenantScopedPool does not support callback-style query(); use promises');
    }
    const tenantId = options.tenantId();
    if (tenantId === undefined) return rawQuery(...args);
    const client = await rawConnect();
    let failure: unknown;
    try {
      await setTenant(client, tenantId);
      return await (client.query as (...a: QueryArgs) => Promise<QueryResult<Record<string, unknown>>>)(...args);
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      if (failure !== undefined) {
        // a failed statement may have left the connection mid-transaction; clear best-effort, then release
        await clearTenant(client).catch(() => undefined);
        client.release();
      } else {
        await clearTenant(client).then(() => { client.release(); }, (e: unknown) => { (client.release as (err?: unknown) => void)(e); });
      }
    }
  }

  return new Proxy(pool, {
    get(target, prop, receiver) {
      if (prop === 'query') return scopedQuery;
      if (prop === 'connect') return scopedConnect;
      const value: unknown = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
