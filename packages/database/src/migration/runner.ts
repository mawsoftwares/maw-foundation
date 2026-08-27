import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createLogger } from '@mawsoftwares/sdk/kernel/logger';
import type { PgTransactionPool } from '../types';
import { withTransaction } from '../transaction/index';
import type { Migration, MigrationRecord, MigrationRunnerConfig } from './types';

export class MigrationRunner {
  private readonly pool: PgTransactionPool;
  private readonly migrationsDir: string;
  private readonly table: string;
  private readonly logger;

  constructor(config: MigrationRunnerConfig) {
    this.pool = config.pool;
    this.migrationsDir = config.migrationsDir;
    this.table = config.table ?? 'schema_migrations';
    this.logger = config.logger ?? createLogger('migration');
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async loadFromDirectory(): Promise<Migration[]> {
    const files = await readdir(this.migrationsDir);
    const upFiles = files
      .filter((f) => f.endsWith('.up.sql'))
      .sort();

    const migrations: Migration[] = [];
    for (const file of upFiles) {
      const match = file.match(/^(\d+)_(.+)\.up\.sql$/);
      if (!match) continue;

      const version = match[1]!;
      const name = match[2]!;
      const upSql = await readFile(join(this.migrationsDir, file), 'utf-8');

      const downFile = `${version}_${name}.down.sql`;
      let downSql: string | undefined;
      if (files.includes(downFile)) {
        downSql = await readFile(join(this.migrationsDir, downFile), 'utf-8');
      }

      migrations.push({ version, name, upSql, downSql });
    }

    return migrations;
  }

  async up(): Promise<MigrationRecord[]> {
    await this.initialize();
    const migrations = await this.loadFromDirectory();
    const applied = await this.getApplied();
    const appliedVersions = new Set(applied.map((r) => r.version));

    const pending = migrations.filter((m) => !appliedVersions.has(m.version));
    const results: MigrationRecord[] = [];

    for (const migration of pending) {
      const checksum = this.computeChecksum(migration.upSql);
      await withTransaction(this.pool, async (client) => {
        await client.query(migration.upSql);
        await client.query(
          `INSERT INTO ${this.table} (version, name, checksum) VALUES ($1, $2, $3)`,
          [migration.version, migration.name, checksum],
        );
      });

      const record: MigrationRecord = {
        version: migration.version,
        name: migration.name,
        appliedAt: new Date().toISOString(),
        checksum,
      };
      results.push(record);
      this.logger.info(`Applied migration ${migration.version}_${migration.name}`);
    }

    return results;
  }

  async down(count = 1): Promise<string[]> {
    await this.initialize();
    const migrations = await this.loadFromDirectory();
    const applied = await this.getApplied();

    const toRollback = applied.slice(-count).reverse();
    const rolledBack: string[] = [];

    for (const record of toRollback) {
      const migration = migrations.find((m) => m.version === record.version);
      if (!migration?.downSql) {
        throw new Error(`No down migration for version ${record.version}`);
      }

      await withTransaction(this.pool, async (client) => {
        await client.query(migration.downSql!);
        await client.query(
          `DELETE FROM ${this.table} WHERE version = $1`,
          [record.version],
        );
      });

      rolledBack.push(record.version);
      this.logger.info(`Rolled back migration ${record.version}_${record.name}`);
    }

    return rolledBack;
  }

  async status(): Promise<{ applied: MigrationRecord[]; pending: Migration[] }> {
    await this.initialize();
    const migrations = await this.loadFromDirectory();
    const applied = await this.getApplied();
    const appliedVersions = new Set(applied.map((r) => r.version));

    const pending = migrations.filter((m) => !appliedVersions.has(m.version));
    return { applied, pending };
  }

  async verify(): Promise<{ valid: boolean; drifted: string[] }> {
    await this.initialize();
    const migrations = await this.loadFromDirectory();
    const applied = await this.getApplied();
    const drifted: string[] = [];

    for (const record of applied) {
      const migration = migrations.find((m) => m.version === record.version);
      if (!migration) continue;

      const currentChecksum = this.computeChecksum(migration.upSql);
      if (currentChecksum !== record.checksum) {
        drifted.push(record.version);
      }
    }

    return { valid: drifted.length === 0, drifted };
  }

  private async getApplied(): Promise<MigrationRecord[]> {
    const { rows } = await this.pool.query<{
      version: string;
      name: string;
      applied_at: string;
      checksum: string;
    }>(`SELECT version, name, applied_at, checksum FROM ${this.table} ORDER BY version ASC`);

    return rows.map((r) => ({
      version: r.version,
      name: r.name,
      appliedAt: r.applied_at,
      checksum: r.checksum,
    }));
  }

  private computeChecksum(sql: string): string {
    return createHash('sha256').update(sql).digest('hex').slice(0, 16);
  }
}
