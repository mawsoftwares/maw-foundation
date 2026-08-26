import type { PgClient, PgTransactionPool } from '../types';

export type TransactionIsolationLevel =
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

export interface TransactionOptions {
  isolationLevel?: TransactionIsolationLevel;
  readOnly?: boolean;
}

export async function withTransaction<T>(
  pool: PgTransactionPool,
  fn: (client: PgClient) => Promise<T>,
  options?: TransactionOptions,
): Promise<T> {
  const client = await pool.connect();
  try {
    let beginSql = 'BEGIN';
    if (options?.isolationLevel) {
      beginSql += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }
    if (options?.readOnly) {
      beginSql += ' READ ONLY';
    }
    await client.query(beginSql);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function withSavepoint<T>(
  client: PgClient,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_');
  await client.query(`SAVEPOINT ${safeName}`);
  try {
    const result = await fn();
    await client.query(`RELEASE SAVEPOINT ${safeName}`);
    return result;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${safeName}`);
    throw err;
  }
}
