// Types
export type { PgPool, PgClient, PgTransactionPool, QueryResult, RowMapper } from './types';

// Pool
export { createDatabasePool, closeDatabasePool, registerShutdownHook, loadDatabaseConfig } from './pool/index';
export type { DatabaseConfig } from './pool/index';

// Errors
export { translatePgError, isPgError, withPgErrorTranslation } from './errors/index';
export type { PgError } from './errors/index';

// Transaction
export { withTransaction, withSavepoint } from './transaction/index';
export type { TransactionOptions, TransactionIsolationLevel } from './transaction/index';

// Entity types
export type {
  BaseEntity, TimestampedEntity, TenantScopedEntity,
  SoftDeletableEntity, VersionedEntity, AuditableEntity,
} from './entity/index';

// Mappers
export { snakeToCamel, camelToSnake, mapRow, mapRows, createRowMapper, dateToIso, nullToUndefined } from './entity/mappers';
export type { FieldMapping } from './entity/mappers';

// Query
export { QueryBuilder, safeSortColumn } from './query/index';
export type { QueryBuilderResult, PaginationOptions } from './query/index';

// Repository
export { BaseRepository } from './repository/index';
export type { FindOptions, RepositoryConfig } from './repository/index';

// Tenant
export { TenantScopedRepository, setTenantContext } from './tenant/index';

// Soft delete
export { SoftDeleteRepository } from './soft-delete/index';

// Migration
export { MigrationRunner } from './migration/runner';
export type { Migration, MigrationRecord, MigrationRunnerConfig } from './migration/types';

// Seed
export { runSeed, runSeeds } from './seed/index';
export type { SeedFn, SeedConfig } from './seed/index';

// Health
export { pgCheck, poolHealthCheck, migrationHealthCheck } from './health/index';
export type { HealthCheckResult, PoolStats } from './health/index';

// Testing
export { withTestTransaction, createTestPool, truncateTables, MockPgPool } from './testing/index';

// Drizzle
export { createDrizzle } from './drizzle/index';
export type { DrizzleDb } from './drizzle/index';

// Schema
export * as schema from './schema/index';
