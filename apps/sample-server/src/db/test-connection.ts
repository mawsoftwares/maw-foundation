import pg from 'pg';
import { getRequiredEnv, createLogger } from '@maw/sdk';

const log = createLogger('db:test');
const client = new pg.Client({ connectionString: getRequiredEnv('DATABASE_URL') });

await client.connect();
await client.query('select 1 as ok');
await client.end();
log.info('database reachable');
