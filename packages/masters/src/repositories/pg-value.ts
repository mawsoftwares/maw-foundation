import type { PgPool, PgClient } from '@maw/database';
import { QueryBuilder, withPgErrorTranslation } from '@maw/database';
import { paginate, type PaginatedResult, Pagination } from '@maw/sdk/config/constants';
import type { MasterValue, MasterOption } from '../types/entities';
import type { CreateValueInput, UpdateValueInput, ValueListQuery, OperationContext } from '../types/dto';
import type { IMasterValueRepository } from '../types/ports';

interface ValueRow {
  id: string;
  master_id: string;
  code: string;
  label: string;
  value: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: Date | null;
  version: number;
}

function toValue(row: ValueRow): MasterValue {
  return {
    id: row.id,
    masterId: row.master_id,
    code: row.code,
    label: row.label,
    value: row.value,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at?.toISOString() ?? null,
    version: row.version,
  };
}

const TABLE = 'master_values';
const COLUMNS = `id, master_id, code, label, value, sort_order, is_active, metadata,
  created_at, updated_at, created_by, updated_by, deleted_at, version`;

export class PgMasterValueRepository implements IMasterValueRepository {
  constructor(private readonly pool: PgPool) {}

  private conn(client?: PgClient): PgPool {
    return client ?? this.pool;
  }

  async findById(masterId: string, id: string, client?: PgClient): Promise<MasterValue | null> {
    const { rows } = await this.conn(client).query<ValueRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE master_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
      [masterId, id],
    );
    return rows[0] ? toValue(rows[0]) : null;
  }

  async findByCode(masterId: string, code: string, client?: PgClient): Promise<MasterValue | null> {
    const { rows } = await this.conn(client).query<ValueRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE master_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
      [masterId, code],
    );
    return rows[0] ? toValue(rows[0]) : null;
  }

  async list(masterId: string, query: ValueListQuery, client?: PgClient): Promise<PaginatedResult<MasterValue>> {
    const page = query.page ?? Pagination.DEFAULT_PAGE;
    const pageSize = Math.min(query.pageSize ?? Pagination.DEFAULT_PAGE_SIZE, Pagination.MAX_PAGE_SIZE);

    const qb = new QueryBuilder();
    qb.where('master_id', masterId);
    qb.whereNull('deleted_at');
    if (query.isActive !== undefined) qb.where('is_active', query.isActive);
    if (!query.includeInactive) qb.where('is_active', true);
    if (query.search !== undefined) qb.whereOp('label', 'ILIKE', `%${query.search}%`);

    const { sql: countSql, params: countParams } = qb.build();
    const { rows: countRows } = await this.conn(client).query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${TABLE} ${countSql}`,
      countParams,
    );
    const total = parseInt(countRows[0]?.count ?? '0', 10);

    const qb2 = new QueryBuilder();
    qb2.where('master_id', masterId);
    qb2.whereNull('deleted_at');
    if (query.isActive !== undefined) qb2.where('is_active', query.isActive);
    if (!query.includeInactive) qb2.where('is_active', true);
    if (query.search !== undefined) qb2.whereOp('label', 'ILIKE', `%${query.search}%`);

    const { sql, params } = qb2.buildWithPagination({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: query.sortBy ?? 'sort_order',
      direction: query.sortOrder ?? 'asc',
      allowedSortColumns: ['sort_order', 'label', 'code', 'created_at'],
    });

    const { rows } = await this.conn(client).query<ValueRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} ${sql}`,
      params,
    );

    return paginate(rows.map(toValue), total, page, pageSize);
  }

  async options(masterId: string, search?: string, client?: PgClient): Promise<MasterOption[]> {
    let sql = `SELECT code, label, sort_order FROM ${TABLE} WHERE master_id = $1 AND is_active = TRUE AND deleted_at IS NULL`;
    const params: unknown[] = [masterId];

    if (search) {
      sql += ` AND label ILIKE $2`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY sort_order ASC, label ASC LIMIT 500`;

    const { rows } = await this.conn(client).query<{ code: string; label: string; sort_order: number }>(sql, params);
    return rows.map((r) => ({ value: r.code, label: r.label, sortOrder: r.sort_order }));
  }

  async create(masterId: string, input: CreateValueInput, ctx: OperationContext, client?: PgClient): Promise<MasterValue> {
    const id = crypto.randomUUID();
    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<ValueRow>(
        `INSERT INTO ${TABLE} (id, master_id, code, label, value, sort_order, is_active, metadata, created_by, updated_by, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, 1)
         RETURNING ${COLUMNS}`,
        [
          id, masterId, input.code, input.label, input.value ?? null,
          input.sortOrder ?? 0, input.isActive ?? true,
          input.metadata ? JSON.stringify(input.metadata) : null,
          ctx.userId,
        ],
      ),
    );
    return toValue(rows[0]!);
  }

  async createBulk(masterId: string, inputs: readonly CreateValueInput[], ctx: OperationContext, client?: PgClient): Promise<MasterValue[]> {
    const results: MasterValue[] = [];
    for (const input of inputs) {
      results.push(await this.create(masterId, input, ctx, client));
    }
    return results;
  }

  async update(masterId: string, id: string, input: UpdateValueInput, ctx: OperationContext, client?: PgClient): Promise<MasterValue> {
    const sets: string[] = ['updated_at = NOW()', 'updated_by = $3', 'version = version + 1'];
    const params: unknown[] = [masterId, id, ctx.userId];
    let idx = 4;

    if (input.label !== undefined) { sets.push(`label = $${idx}`); params.push(input.label); idx++; }
    if (input.value !== undefined) { sets.push(`value = $${idx}`); params.push(input.value); idx++; }
    if (input.sortOrder !== undefined) { sets.push(`sort_order = $${idx}`); params.push(input.sortOrder); idx++; }
    if (input.isActive !== undefined) { sets.push(`is_active = $${idx}`); params.push(input.isActive); idx++; }
    if (input.metadata !== undefined) { sets.push(`metadata = $${idx}`); params.push(input.metadata ? JSON.stringify(input.metadata) : null); idx++; }

    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<ValueRow>(
        `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE master_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
        params,
      ),
    );
    return toValue(rows[0]!);
  }

  async softDelete(masterId: string, id: string, client?: PgClient): Promise<boolean> {
    const { rowCount } = await this.conn(client).query(
      `UPDATE ${TABLE} SET deleted_at = NOW() WHERE master_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [masterId, id],
    );
    return (rowCount ?? 0) > 0;
  }

  async restore(masterId: string, id: string, client?: PgClient): Promise<boolean> {
    const { rowCount } = await this.conn(client).query(
      `UPDATE ${TABLE} SET deleted_at = NULL WHERE master_id = $1 AND id = $2 AND deleted_at IS NOT NULL`,
      [masterId, id],
    );
    return (rowCount ?? 0) > 0;
  }

  async reorder(masterId: string, valueIds: readonly string[], client?: PgClient): Promise<void> {
    for (let i = 0; i < valueIds.length; i++) {
      await this.conn(client).query(
        `UPDATE ${TABLE} SET sort_order = $3, updated_at = NOW() WHERE master_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [masterId, valueIds[i], i + 1],
      );
    }
  }
}
