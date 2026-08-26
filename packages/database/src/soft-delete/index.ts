import type { PgClient } from '../types';
import { BaseRepository } from '../repository/index';
import type { FindOptions } from '../repository/index';
import { QueryBuilder } from '../query/index';

export abstract class SoftDeleteRepository<
  TRow extends Record<string, unknown>,
  TEntity,
> extends BaseRepository<TRow, TEntity> {
  async findManyActive(query: QueryBuilder | null, options?: FindOptions): Promise<TEntity[]> {
    const qb = new QueryBuilder().whereNull('deleted_at');
    if (query) {
      const { sql: extraSql, params: extraParams } = query.build();
      if (extraSql) {
        qb.whereRaw(extraSql.replace(/^WHERE /, ''), extraParams);
      }
    }
    return this.findMany(qb, options);
  }

  async findManyIncludeDeleted(query: QueryBuilder | null, options?: FindOptions): Promise<TEntity[]> {
    const qb = query ?? new QueryBuilder();
    return this.findMany(qb, options);
  }

  async softDelete(id: string, client?: PgClient): Promise<boolean> {
    const where = new QueryBuilder().where(this.idColumn, id);
    const count = await this.update(
      'deleted_at = NOW()',
      [],
      where,
      client,
    );
    return count > 0;
  }

  async restore(id: string, client?: PgClient): Promise<boolean> {
    const where = new QueryBuilder().where(this.idColumn, id);
    const count = await this.update(
      'deleted_at = NULL',
      [],
      where,
      client,
    );
    return count > 0;
  }

  async hardDelete(id: string, client?: PgClient): Promise<boolean> {
    const where = new QueryBuilder().where(this.idColumn, id);
    const count = await this.delete(where, client);
    return count > 0;
  }
}
