import { getEnv, getRequiredEnv, getEnvInt, getEnvBool } from '@mawsoftwares/sdk/config/env';
import { createLogger } from '@mawsoftwares/sdk/kernel/logger';
import type { PgTransactionPool } from '../types';

const logger = createLogger('database');

export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statementTimeout?: number;
}

export function loadDatabaseConfig(): DatabaseConfig {
  const connectionString = getEnv('DATABASE_URL');
  if (connectionString) {
    return {
      connectionString,
      max: getEnvInt('DB_POOL_MAX', 10),
      idleTimeoutMillis: getEnvInt('DB_IDLE_TIMEOUT_MS', 30_000),
      connectionTimeoutMillis: getEnvInt('DB_CONNECTION_TIMEOUT_MS', 5_000),
      statementTimeout: getEnvInt('DB_STATEMENT_TIMEOUT_MS', 30_000),
      ssl: getEnvBool('DB_SSL', false),
    };
  }

  return {
    host: getRequiredEnv('DB_HOST'),
    port: getEnvInt('DB_PORT', 5432),
    database: getRequiredEnv('DB_NAME'),
    user: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    ssl: getEnvBool('DB_SSL', false),
    max: getEnvInt('DB_POOL_MAX', 10),
    idleTimeoutMillis: getEnvInt('DB_IDLE_TIMEOUT_MS', 30_000),
    connectionTimeoutMillis: getEnvInt('DB_CONNECTION_TIMEOUT_MS', 5_000),
    statementTimeout: getEnvInt('DB_STATEMENT_TIMEOUT_MS', 30_000),
  };
}

export async function createDatabasePool(config?: DatabaseConfig): Promise<PgTransactionPool> {
  const resolved = config ?? loadDatabaseConfig();

  // pg is a peer dependency — imported dynamically at runtime
  const pg = await import('pg');
  const Pool = pg.default?.Pool ?? pg.Pool;

  const pool = new Pool({
    connectionString: resolved.connectionString,
    host: resolved.host,
    port: resolved.port,
    database: resolved.database,
    user: resolved.user,
    password: resolved.password,
    ssl: resolved.ssl,
    max: resolved.max,
    idleTimeoutMillis: resolved.idleTimeoutMillis,
    connectionTimeoutMillis: resolved.connectionTimeoutMillis,
    statement_timeout: resolved.statementTimeout,
  });

  pool.on('error', (err: Error) => {
    logger.error('Unexpected pool error', { error: err.message });
  });

  return pool as unknown as PgTransactionPool;
}

export async function closeDatabasePool(
  pool: PgTransactionPool,
  timeoutMs = 5_000,
): Promise<void> {
  const pgPool = pool as unknown as { end(): Promise<void> };
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Pool drain timeout')), timeoutMs),
  );
  await Promise.race([pgPool.end(), timeout]);
  logger.info('Database pool closed');
}

export function registerShutdownHook(pool: PgTransactionPool): void {
  const shutdown = () => {
    closeDatabasePool(pool).catch((err) => {
      logger.error('Error closing pool on shutdown', { error: (err as Error).message });
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
