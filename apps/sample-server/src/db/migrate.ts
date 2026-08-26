import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MigrationRunner, createDatabasePool, closeDatabasePool } from '@maw/database';
import { createLogger } from '@maw/sdk';

const log = createLogger('migrate');
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = await createDatabasePool();
const runner = new MigrationRunner({
  pool,
  migrationsDir: resolve(__dirname, '../../migrations'),
  logger: log,
});

try {
  const applied = await runner.up();
  if (applied.length === 0) {
    log.info('No pending migrations.');
  } else {
    log.info(`Applied ${applied.length} migration(s).`, {
      versions: applied.map((m) => `${m.version}_${m.name}`),
    });
  }

  const { valid, drifted } = await runner.verify();
  if (!valid) {
    log.warn('Checksum drift detected', { drifted });
  }
} finally {
  await closeDatabasePool(pool);
}
