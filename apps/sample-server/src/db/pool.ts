import pg from 'pg';
import { getRequiredEnv } from '@maw/sdk';

export const pool = new pg.Pool({ connectionString: getRequiredEnv('DATABASE_URL') });
