import type { PgClient, PgTransactionPool, QueryResult } from '../types';

export async function withTestTransaction<T>(
  pool: PgTransactionPool,
  fn: (client: PgClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('ROLLBACK');
    return result;
  } finally {
    client.release();
  }
}

export async function createTestPool(): Promise<PgTransactionPool> {
  const { getEnv } = await import('@maw/sdk/config/env');
  const connectionString = getEnv('TEST_DATABASE_URL') ?? getEnv('DATABASE_URL');
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for test pool');
  }

  const { default: pg } = await import('pg');
  return new pg.Pool({ connectionString }) as unknown as PgTransactionPool;
}

export async function truncateTables(
  pool: PgTransactionPool,
  tables: string[],
): Promise<void> {
  if (tables.length === 0) return;
  await pool.query(`TRUNCATE ${tables.join(', ')} CASCADE`);
}

type MockQueryHandler = (sql: string, params?: unknown[]) => QueryResult<Record<string, unknown>>;

interface MockCall {
  sql: string;
  params?: unknown[];
}

export class MockPgPool implements PgTransactionPool {
  private handlers: Array<{ pattern: RegExp; handler: MockQueryHandler }> = [];
  private defaultResult: QueryResult<Record<string, unknown>> = { rows: [], rowCount: 0 };
  readonly calls: MockCall[] = [];

  mockQuery(pattern: RegExp, handler: MockQueryHandler | QueryResult<Record<string, unknown>>): void {
    const fn = typeof handler === 'function' ? handler : () => handler;
    this.handlers.push({ pattern, handler: fn });
  }

  mockDefault(result: QueryResult<Record<string, unknown>>): void {
    this.defaultResult = result;
  }

  async query<R = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<R>> {
    this.calls.push({ sql, params });
    for (const { pattern, handler } of this.handlers) {
      if (pattern.test(sql)) {
        return handler(sql, params) as QueryResult<R>;
      }
    }
    return this.defaultResult as QueryResult<R>;
  }

  async connect(): Promise<PgClient> {
    return {
      query: this.query.bind(this),
      release: () => {},
    } as PgClient;
  }

  assertCalled(pattern: RegExp): MockCall | undefined {
    return this.calls.find((c) => pattern.test(c.sql));
  }

  assertCalledWith(pattern: RegExp, params: unknown[]): boolean {
    const call = this.assertCalled(pattern);
    if (!call) return false;
    return JSON.stringify(call.params) === JSON.stringify(params);
  }

  reset(): void {
    this.calls.length = 0;
    this.handlers.length = 0;
    this.defaultResult = { rows: [], rowCount: 0 };
  }
}
