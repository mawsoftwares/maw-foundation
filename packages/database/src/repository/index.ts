import type { PgPool, PgClient, RowMapper } from '../types';
import { QueryBuilder } from '../query/index';
import type { PaginationOptions } from '../query/index';
import { withPgErrorTranslation } from '../errors/index';
import { mapRow } from '../entity/mappers';

export interface FindOptions extends PaginationOptions {
  client?: PgClient;
}

export interface RepositoryConfig<TRow, TEntity> {
  pool: PgPool;
  table: string;
  mapper?: RowMapper<TRow, TEntity>;
  idColumn?: string;
}

export abstract class BaseRepository<
  TRow extends Record<string, unknown>,
  TEntity,
> {
  protected readonly pool: PgPool;
  protected readonly table: string;
  protected readonly mapper: RowMapper<TRow, TEntity>;
  protected readonly idColumn: string;

  constructor(config: RepositoryConfig<TRow, TEntity>) {
    this.pool = config.pool;
    this.table = config.table;
    this.mapper = config.mapper ?? ((row: TRow) => mapRow<TEntity>(row as Record<string, unknown>));
    this.idColumn = config.idColumn ?? 'id';
  }

  protected conn(client?: PgClient): PgPool {
    return client ?? this.pool;
  }

  async findOneById(id: string, client?: PgClient): Promise<TEntity | null> {
    const { rows } = await this.conn(client).query<TRow>(
      `SELECT * FROM ${this.table} WHERE ${this.idColumn} = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? this.mapper(rows[0]) : null;
  }

  async findOne(query: QueryBuilder, client?: PgClient): Promise<TEntity | null> {
    const { sql, params } = query.build();
    const { rows } = await this.conn(client).query<TRow>(
      `SELECT * FROM ${this.table} ${sql} LIMIT 1`,
      params,
    );
    return rows[0] ? this.mapper(rows[0]) : null;
  }

  async findMany(query: QueryBuilder, options?: FindOptions): Promise<TEntity[]> {
    const { sql, params } = query.buildWithPagination({
      limit: options?.limit,
      offset: options?.offset,
      orderBy: options?.orderBy,
      direction: options?.direction,
      allowedSortColumns: options?.allowedSortColumns,
    });
    const { rows } = await this.conn(options?.client).query<TRow>(
      `SELECT * FROM ${this.table} ${sql}`,
      params,
    );
    return rows.map(this.mapper);
  }

  async count(query: QueryBuilder, client?: PgClient): Promise<number> {
    const { sql, params } = query.build();
    const { rows } = await this.conn(client).query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${this.table} ${sql}`,
      params,
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  async insertReturning(
    columns: string[],
    values: unknown[],
    returning = '*',
    client?: PgClient,
  ): Promise<TEntity> {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<TRow>(
        `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`,
        values,
      ),
    );
    return this.mapper(rows[0]!);
  }

  async upsert(
    columns: string[],
    values: unknown[],
    conflictTarget: string,
    updateColumns: string[],
    client?: PgClient,
  ): Promise<TEntity> {
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const updates = updateColumns
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ');
    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<TRow>(
        `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates} RETURNING *`,
        values,
      ),
    );
    return this.mapper(rows[0]!);
  }

  async update(
    setClause: string,
    params: unknown[],
    where: QueryBuilder,
    client?: PgClient,
  ): Promise<number> {
    const { sql: whereSql, params: whereParams } = where.build();
    const allParams = [...params, ...whereParams];
    const { rowCount } = await withPgErrorTranslation(() =>
      this.conn(client).query(
        `UPDATE ${this.table} SET ${setClause} ${whereSql}`,
        allParams,
      ),
    );
    return rowCount ?? 0;
  }

  async delete(where: QueryBuilder, client?: PgClient): Promise<number> {
    const { sql, params } = where.build();
    const { rowCount } = await this.conn(client).query(
      `DELETE FROM ${this.table} ${sql}`,
      params,
    );
    return rowCount ?? 0;
  }
}
