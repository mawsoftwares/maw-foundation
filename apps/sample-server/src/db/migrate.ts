import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getRequiredEnv, createLogger } from '@maw/sdk';

const log = createLogger('migrate');
const DATABASE_URL = getRequiredEnv('DATABASE_URL');

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrations = [
  '001_auth_rbac.sql',
  '002_dynamic_rbac.sql',
  '003_audit_logs.sql',
  '004_auth_foundation.sql',
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  for (const file of migrations) {
    const sql = readFileSync(resolve(__dirname, '../../migrations', file), 'utf-8');
    try {
      await client.query(sql);
      log.info(`${file} — applied.`);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '42P07') {
        log.info(`${file} — tables already exist, skipping.`);
      } else {
        throw err;
      }
    }
  }
  log.info('All migrations complete.');
} finally {
  await client.end();
}
