import type { PgClient, PgTransactionPool } from '../types';
import { withTransaction } from '../transaction/index';

export type SeedFn = (client: PgClient) => Promise<void>;

export interface SeedConfig {
  pool: PgTransactionPool;
}

export async function runSeed(config: SeedConfig, fn: SeedFn): Promise<void> {
  await withTransaction(config.pool, fn);
}

export async function runSeeds(config: SeedConfig, fns: SeedFn[]): Promise<void> {
  for (const fn of fns) {
    await runSeed(config, fn);
  }
}
