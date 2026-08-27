import type { PgPool, PgClient } from '@mawsoftwares/database';
import { QueryBuilder, withPgErrorTranslation } from '@mawsoftwares/database';
import { paginate, type PaginatedResult, Pagination } from '@mawsoftwares/sdk/config/constants';
import type { Master } from '../types/entities';
import type { CreateMasterInput, UpdateMasterInput, MasterListQuery, OperationContext } from '../types/dto';
import type { IMasterRepository } from '../types/ports';
import { masterNotFound } from '../errors/index';

interface MasterRow {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  is_system: boolean;
  allow_custom_values: boolean;
  config: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: Date | null;
  version: number;
}

function toMaster(row: MasterRow): Master {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status as Master['status'],
    isSystem: row.is_system,
    allowCustomValues: row.allow_custom_values,
    config: row.config as Master['config'],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at?.toISOString() ?? null,
    version: row.version,
  };
}

const TABLE = 'masters';
const COLUMNS = `id, tenant_id, code, name, description, status, is_system, allow_custom_values,
  config, created_at, updated_at, created_by, updated_by, deleted_at, version`;

export class PgMasterRepository implements IMasterRepository {
  constructor(private readonly pool: PgPool) {}

  private conn(client?: PgClient): PgPool {
    return client ?? this.pool;
  }

  async findById(tenantId: string, id: string, client?: PgClient): Promise<Master | null> {
    const { rows } = await this.conn(client).query<MasterRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? toMaster(rows[0]) : null;
  }

  async findByCode(tenantId: string, code: string, client?: PgClient): Promise<Master | null> {
    const { rows } = await this.conn(client).query<MasterRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
      [tenantId, code],
    );
    return rows[0] ? toMaster(rows[0]) : null;
  }

  async list(tenantId: string, query: MasterListQuery, client?: PgClient): Promise<PaginatedResult<Master>> {
    const qb = new QueryBuilder();
    qb.where('tenant_id', tenantId);
    qb.whereNull('deleted_at');

    if (query.status !== undefined) qb.where('status', query.status);
    if (query.isSystem !== undefined) qb.where('is_system', query.isSystem);
    if (query.search !== undefined) qb.whereOp('name', 'ILIKE', `%${query.search}%`);

    const page = query.page ?? Pagination.DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? Pagination.DEFAULT_PAGE_SIZE, Pagination.MAX_PAGE_SIZE);

    const { sql: countSql, params: countParams } = qb.build();
    const { rows: countRows } = await this.conn(client).query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${TABLE} ${countSql}`,
      countParams,
    );
    const total = parseInt(countRows[0]?.count ?? '0', 10);

    const qb2 = new QueryBuilder();
    qb2.where('tenant_id', tenantId);
    qb2.whereNull('deleted_at');
    if (query.status !== undefined) qb2.where('status', query.status);
    if (query.isSystem !== undefined) qb2.where('is_system', query.isSystem);
    if (query.search !== undefined) qb2.whereOp('name', 'ILIKE', `%${query.search}%`);

    const { sql, params } = qb2.buildWithPagination({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: query.sortBy ?? 'name',
      direction: query.sortOrder ?? 'asc',
      allowedSortColumns: ['name', 'code', 'created_at', 'updated_at', 'status'],
    });

    const { rows } = await this.conn(client).query<MasterRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} ${sql}`,
      params,
    );

    return paginate(rows.map(toMaster), total, page, pageSize);
  }

  async create(tenantId: string, input: CreateMasterInput, ctx: OperationContext, client?: PgClient): Promise<Master> {
    const id = crypto.randomUUID();
    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<MasterRow>(
        `INSERT INTO ${TABLE} (id, tenant_id, code, name, description, status, is_system, allow_custom_values, config, created_by, updated_by, version)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $9, 1)
         RETURNING ${COLUMNS}`,
        [
          id, tenantId, input.code, input.name, input.description ?? null,
          input.isSystem ?? false, input.allowCustomValues ?? true,
          input.config ? JSON.stringify(input.config) : null,
          ctx.userId,
        ],
      ),
    );
    return toMaster(rows[0]!);
  }

  async update(tenantId: string, id: string, input: UpdateMasterInput, ctx: OperationContext, client?: PgClient): Promise<Master> {
    const sets: string[] = ['updated_at = NOW()', 'updated_by = $3', 'version = version + 1'];
    const params: unknown[] = [tenantId, id, ctx.userId];
    let idx = 4;

    if (input.name !== undefined) { sets.push(`name = $${idx}`); params.push(input.name); idx++; }
    if (input.description !== undefined) { sets.push(`description = $${idx}`); params.push(input.description); idx++; }
    if (input.status !== undefined) { sets.push(`status = $${idx}`); params.push(input.status); idx++; }
    if (input.allowCustomValues !== undefined) { sets.push(`allow_custom_values = $${idx}`); params.push(input.allowCustomValues); idx++; }
    if (input.config !== undefined) { sets.push(`config = $${idx}`); params.push(input.config ? JSON.stringify(input.config) : null); idx++; }

    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<MasterRow>(
        `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
        params,
      ),
    );
    if (!rows[0]) throw masterNotFound(id);
    return toMaster(rows[0]);
  }

  async softDelete(tenantId: string, id: string, ctx: OperationContext, client?: PgClient): Promise<boolean> {
    const { rowCount } = await this.conn(client).query(
      `UPDATE ${TABLE} SET deleted_at = NOW(), updated_by = $3 WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id, ctx.userId],
    );
    return (rowCount ?? 0) > 0;
  }

  async restore(tenantId: string, id: string, ctx: OperationContext, client?: PgClient): Promise<boolean> {
    const { rowCount } = await this.conn(client).query(
      `UPDATE ${TABLE} SET deleted_at = NULL, updated_by = $3 WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id, ctx.userId],
    );
    return (rowCount ?? 0) > 0;
  }
}
