import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL === undefined) {
  throw new Error('DATABASE_URL is required when using Postgres mode');
}

export const pool = new pg.Pool({ connectionString: DATABASE_URL });
