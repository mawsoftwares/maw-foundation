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
const sql = readFileSync(resolve(__dirname, '../../migrations/001_auth_rbac.sql'), 'utf-8');

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

try {
  await client.query(sql);
  console.log('[migrate] Tables created successfully.');
} catch (err: unknown) {
  const pgErr = err as { code?: string; message?: string };
  if (pgErr.code === '42P07') {
    console.log('[migrate] Tables already exist — skipping.');
  } else {
    throw err;
  }
} finally {
  await client.end();
}
