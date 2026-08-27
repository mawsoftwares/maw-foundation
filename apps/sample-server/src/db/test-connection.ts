import { createDatabasePool, closeDatabasePool, pgCheck } from '@mawsoftwares/database';
import { createLogger } from '@mawsoftwares/sdk';

const log = createLogger('db:test');
const pool = await createDatabasePool();

const check = pgCheck(pool);
await check();
log.info('database reachable');

await closeDatabasePool(pool);
