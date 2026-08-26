import { createDatabasePool, closeDatabasePool, pgCheck } from '@maw/database';
import { createLogger } from '@maw/sdk';

const log = createLogger('db:test');
const pool = await createDatabasePool();

const check = pgCheck(pool);
await check();
log.info('database reachable');

await closeDatabasePool(pool);
