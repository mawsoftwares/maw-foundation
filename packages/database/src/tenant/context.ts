import type { PgClient, PgTransactionPool } from '../types';
import { withTransaction, type TransactionOptions } from '../transaction/index';
import { TENANT_SETTING } from './rls';

/**
 * Sets the tenant for the current transaction (`app.tenant_id`), which the RLS policies read.
 * Uses `set_config(..., true)` (transaction-local): `SET LOCAL ... = $1` is rejected by Postgres because
 * utility statements cannot take bind parameters. Must run inside a transaction.
 */
export async function setTenantContext(client: PgClient, tenantId: string): Promise<void> {
  if (tenantId.trim() === '') throw new Error('setTenantContext requires a non-empty tenantId');
  await client.query(`SELECT set_config('${TENANT_SETTING}', $1, true)`, [tenantId]);
}

/**
 * Runs `fn` in one transaction whose queries all see only `tenantId`'s rows (with a non-bypassing role).
 * The setting disappears at COMMIT/ROLLBACK, so a pooled connection never carries a tenant into the
 * next request.
 */
export function withTenantTransaction<T>(
  pool: PgTransactionPool,
  tenantId: string,
  fn: (client: PgClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  return withTransaction(
    pool,
    async (client) => {
      await setTenantContext(client, tenantId);
      return fn(client);
    },
    options,
  );
}
