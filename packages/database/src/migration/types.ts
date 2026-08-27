export interface Migration {
  version: string;
  name: string;
  upSql: string;
  downSql?: string;
}

export interface MigrationRecord {
  version: string;
  name: string;
  appliedAt: string;
  checksum: string;
}

export interface MigrationRunnerConfig {
  pool: import('../types').PgTransactionPool;
  migrationsDir: string;
  table?: string;
  logger?: import('@mawsoftwares/sdk/kernel/logger').Logger;
}
