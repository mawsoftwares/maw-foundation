import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NodePgClient } from 'drizzle-orm/node-postgres';
import type { PgTransactionPool } from '../types';
import * as schema from '../schema/index';

export type DrizzleDb = NodePgDatabase<typeof schema>;

export function createDrizzle(pool: PgTransactionPool): DrizzleDb {
  return drizzle(pool as unknown as NodePgClient, { schema });
}
