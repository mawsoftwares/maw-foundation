import { createDatabasePool, registerShutdownHook, type PgTransactionPool } from '@maw/database';

let _pool: PgTransactionPool | null = null;

export async function getPool(): Promise<PgTransactionPool> {
  if (_pool === null) {
    _pool = await createDatabasePool();
    registerShutdownHook(_pool);
  }
  return _pool;
}
