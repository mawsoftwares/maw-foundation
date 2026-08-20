import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL first. Example: postgresql://user:pass@localhost:5432/maw_dev');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrations = [
  '001_auth_rbac.sql',
  '002_dynamic_rbac.sql',
  '003_audit_logs.sql',
];

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  for (const file of migrations) {
    const sql = readFileSync(resolve(__dirname, '../../migrations', file), 'utf-8');
    try {
      await client.query(sql);
      console.log(`[migrate] ${file} — applied.`);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '42P07') {
        console.log(`[migrate] ${file} — tables already exist, skipping.`);
      } else {
        throw err;
      }
    }
  }
  console.log('[migrate] All migrations complete.');
} finally {
  await client.end();
}
