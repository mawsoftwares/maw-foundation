import type { PgClient } from '../types';
import { BaseRepository } from '../repository/index';
import type { RepositoryConfig, FindOptions } from '../repository/index';
import { QueryBuilder } from '../query/index';

export async function setTenantContext(client: PgClient, tenantId: string): Promise<void> {
  await client.query(`SET LOCAL app.tenant_id = $1`, [tenantId]);
}

export abstract class TenantScopedRepository<
  TRow extends Record<string, unknown>,
  TEntity,
> extends BaseRepository<TRow, TEntity> {
  protected readonly tenantColumn: string;

  constructor(config: RepositoryConfig<TRow, TEntity> & { tenantColumn?: string }) {
    super(config);
    this.tenantColumn = config.tenantColumn ?? 'tenant_id';
  }

  protected tenantQuery(tenantId: string): QueryBuilder {
    return new QueryBuilder().where(this.tenantColumn, tenantId);
  }

  async findOneByIdInTenant(tenantId: string, id: string, client?: PgClient): Promise<TEntity | null> {
    const { rows } = await this.conn(client).query<TRow>(
      `SELECT * FROM ${this.table} WHERE ${this.tenantColumn} = $1 AND ${this.idColumn} = $2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? this.mapper(rows[0]) : null;
  }

  async findManyInTenant(
    tenantId: string,
    query: QueryBuilder | null,
    options?: FindOptions,
  ): Promise<TEntity[]> {
    const qb = new QueryBuilder().where(this.tenantColumn, tenantId);
    if (query) {
      const { sql: extraSql, params: extraParams } = query.build();
      if (extraSql) {
        qb.whereRaw(extraSql.replace(/^WHERE /, ''), extraParams);
      }
    }
    return this.findMany(qb, options);
  }

  async countInTenant(tenantId: string, query?: QueryBuilder, client?: PgClient): Promise<number> {
    const qb = new QueryBuilder().where(this.tenantColumn, tenantId);
    if (query) {
      const { sql: extraSql, params: extraParams } = query.build();
      if (extraSql) {
        qb.whereRaw(extraSql.replace(/^WHERE /, ''), extraParams);
      }
    }
    return this.count(qb, client);
  }
}
