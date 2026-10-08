/**
 * @mawsoftwares/postgres — PostgreSQL infrastructure adapter.
 * Re-exports everything from @mawsoftwares/database.
 * Core packages depend on interfaces/contracts rather than PostgreSQL directly.
 */
export * from '@mawsoftwares/database';

// Postgres implementations of contracts defined by core packages (which stay database-agnostic).
export { PgTenantRepository } from './tenant-repository';
