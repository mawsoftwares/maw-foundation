import { TenantScopedRepository, QueryBuilder } from '@mawsoftwares/database';
import type { PgPool, PgClient } from '@mawsoftwares/database';
import type { Entity } from '../../domain/entities/Entity';
import type { ListEntitiesQueryDto } from '../../application/dto';

/**
 * CRUD Module Template — Repository Port
 *
 * REPLACE: `Entity` → your domain noun; add query methods for your specific filters.
 */
export interface IEntityRepository {
  create(entity: Omit<Entity, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<Entity>;
  findById(id: string, tenantId: string, client?: PgClient): Promise<Entity | null>;
  findByName(tenantId: string, name: string, client?: PgClient): Promise<Entity | null>;
  search(tenantId: string, query: ListEntitiesQueryDto, options?: { limit?: number; offset?: number }): Promise<Entity[]>;
  count(tenantId: string, query: ListEntitiesQueryDto): Promise<number>;
  update(id: string, tenantId: string, updates: Partial<Entity>, client?: PgClient): Promise<Entity | null>;
  softDelete(id: string, tenantId: string, client?: PgClient): Promise<boolean>;
}

/**
 * Postgres implementation — extends the Foundation's TenantScopedRepository.
 *
 * REPLACE: update `mapper` to match your actual table columns.
 * ADD: more query methods as your domain needs grow.
 */
export class PgEntityRepository extends TenantScopedRepository<Record<string, unknown>, Entity> implements IEntityRepository {
  constructor(pool: PgPool) {
    super({
      pool,
      table: 'entities',              // REPLACE with your table name
      mapper: (row: Record<string, unknown>): Entity => ({
        id: row['id'] as string,
        tenantId: row['tenant_id'] as string,
        name: row['name'] as string,
        description: (row['description'] as string | null) ?? undefined,
        status: row['status'] as Entity['status'],
        createdAt: (row['created_at'] as Date).toISOString(),
        updatedAt: (row['updated_at'] as Date).toISOString(),
        createdBy: (row['created_by'] as string | null) ?? undefined,
        updatedBy: (row['updated_by'] as string | null) ?? undefined,
        deletedAt: (row['deleted_at'] as Date | null)?.toISOString() ?? null,
      }),
    });
  }

  async create(entity: Omit<Entity, 'createdAt' | 'updatedAt'>, client?: PgClient): Promise<Entity> {
    const columns = ['id', 'tenant_id', 'name', 'description', 'status', 'created_by'];
    const values = [entity.id, entity.tenantId, entity.name, entity.description ?? null, entity.status, entity.createdBy ?? null];
    return this.insertReturning(columns, values, '*', client);
  }

  async findById(id: string, tenantId: string, client?: PgClient): Promise<Entity | null> {
    return this.findOneByIdInTenant(tenantId, id, client);
  }

  async findByName(tenantId: string, name: string, client?: PgClient): Promise<Entity | null> {
    const qb = new QueryBuilder().where('name', name).whereNull('deleted_at');
    const { sql, params } = qb.build();
    const qb2 = new QueryBuilder().whereRaw(sql.replace(/^WHERE /, ''), params);
    const results = await this.findManyInTenant(tenantId, qb2, { client });
    return results[0] ?? null;
  }

  async search(tenantId: string, query: ListEntitiesQueryDto, options?: { limit?: number; offset?: number }): Promise<Entity[]> {
    const qb = new QueryBuilder().whereNull('deleted_at');
    if (query.status) qb.where('status', query.status);
    return this.findManyInTenant(tenantId, qb, options);
  }

  async count(tenantId: string, query: ListEntitiesQueryDto): Promise<number> {
    const qb = new QueryBuilder().whereNull('deleted_at');
    if (query.status) qb.where('status', query.status);
    const all = await this.findManyInTenant(tenantId, qb);
    return all.length;
  }

  async update(id: string, tenantId: string, updates: Partial<Entity>, client?: PgClient): Promise<Entity | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const field = (snake: string, camel: keyof Entity) => {
      if (updates[camel] !== undefined) {
        setClauses.push(`${snake} = $${i++}`);
        params.push(updates[camel] ?? null);
      }
    };

    field('name', 'name');
    field('description', 'description');
    field('status', 'status');
    field('updated_by', 'updatedBy');

    if (setClauses.length === 0) return this.findById(id, tenantId, client);
    setClauses.push('updated_at = NOW()');

    const qb = new QueryBuilder().where('id', id).where('tenant_id', tenantId);
    await super.update(setClauses.join(', '), params, qb, client);
    return this.findById(id, tenantId, client);
  }

  async softDelete(id: string, tenantId: string, client?: PgClient): Promise<boolean> {
    const qb = new QueryBuilder().where('id', id).where('tenant_id', tenantId);
    const count = await super.update('deleted_at = NOW(), updated_at = NOW()', [], qb, client);
    return count > 0;
  }
}
