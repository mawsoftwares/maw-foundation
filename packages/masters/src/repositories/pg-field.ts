import type { PgPool, PgClient } from '@mawsoftwares/database';
import { withPgErrorTranslation } from '@mawsoftwares/database';
import type { MasterField } from '../types/entities';
import type { CreateFieldInput, UpdateFieldInput, OperationContext } from '../types/dto';
import type { IMasterFieldRepository } from '../types/ports';

interface FieldRow {
  id: string;
  master_id: string;
  code: string;
  name: string;
  data_type: string;
  is_required: boolean;
  is_unique: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  display_order: number;
  default_value: string | null;
  config: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: Date | null;
}

function toField(row: FieldRow): MasterField {
  return {
    id: row.id,
    masterId: row.master_id,
    code: row.code,
    name: row.name,
    dataType: row.data_type as MasterField['dataType'],
    isRequired: row.is_required,
    isUnique: row.is_unique,
    isSearchable: row.is_searchable,
    isFilterable: row.is_filterable,
    displayOrder: row.display_order,
    defaultValue: row.default_value,
    config: row.config as MasterField['config'],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at?.toISOString() ?? null,
  };
}

const TABLE = 'master_fields';
const COLUMNS = `id, master_id, code, name, data_type, is_required, is_unique, is_searchable,
  is_filterable, display_order, default_value, config, created_at, updated_at, created_by, updated_by, deleted_at`;

export class PgMasterFieldRepository implements IMasterFieldRepository {
  constructor(private readonly pool: PgPool) {}

  private conn(client?: PgClient): PgPool {
    return client ?? this.pool;
  }

  async findById(masterId: string, id: string, client?: PgClient): Promise<MasterField | null> {
    const { rows } = await this.conn(client).query<FieldRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE master_id = $1 AND id = $2 AND deleted_at IS NULL LIMIT 1`,
      [masterId, id],
    );
    return rows[0] ? toField(rows[0]) : null;
  }

  async findByCode(masterId: string, code: string, client?: PgClient): Promise<MasterField | null> {
    const { rows } = await this.conn(client).query<FieldRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE master_id = $1 AND code = $2 AND deleted_at IS NULL LIMIT 1`,
      [masterId, code],
    );
    return rows[0] ? toField(rows[0]) : null;
  }

  async listByMaster(masterId: string, client?: PgClient): Promise<MasterField[]> {
    const { rows } = await this.conn(client).query<FieldRow>(
      `SELECT ${COLUMNS} FROM ${TABLE} WHERE master_id = $1 AND deleted_at IS NULL ORDER BY display_order ASC, name ASC`,
      [masterId],
    );
    return rows.map(toField);
  }

  async create(masterId: string, input: CreateFieldInput, ctx: OperationContext, client?: PgClient): Promise<MasterField> {
    const id = crypto.randomUUID();
    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<FieldRow>(
        `INSERT INTO ${TABLE} (id, master_id, code, name, data_type, is_required, is_unique, is_searchable,
         is_filterable, display_order, default_value, config, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
         RETURNING ${COLUMNS}`,
        [
          id, masterId, input.code, input.name, input.dataType,
          input.isRequired ?? false, input.isUnique ?? false,
          input.isSearchable ?? false, input.isFilterable ?? false,
          input.displayOrder ?? 0, input.defaultValue ?? null,
          input.config ? JSON.stringify(input.config) : null,
          ctx.userId,
        ],
      ),
    );
    return toField(rows[0]!);
  }

  async update(masterId: string, id: string, input: UpdateFieldInput, ctx: OperationContext, client?: PgClient): Promise<MasterField> {
    const sets: string[] = ['updated_at = NOW()', 'updated_by = $3'];
    const params: unknown[] = [masterId, id, ctx.userId];
    let idx = 4;

    if (input.name !== undefined) { sets.push(`name = $${idx}`); params.push(input.name); idx++; }
    if (input.dataType !== undefined) { sets.push(`data_type = $${idx}`); params.push(input.dataType); idx++; }
    if (input.isRequired !== undefined) { sets.push(`is_required = $${idx}`); params.push(input.isRequired); idx++; }
    if (input.isUnique !== undefined) { sets.push(`is_unique = $${idx}`); params.push(input.isUnique); idx++; }
    if (input.isSearchable !== undefined) { sets.push(`is_searchable = $${idx}`); params.push(input.isSearchable); idx++; }
    if (input.isFilterable !== undefined) { sets.push(`is_filterable = $${idx}`); params.push(input.isFilterable); idx++; }
    if (input.displayOrder !== undefined) { sets.push(`display_order = $${idx}`); params.push(input.displayOrder); idx++; }
    if (input.defaultValue !== undefined) { sets.push(`default_value = $${idx}`); params.push(input.defaultValue); idx++; }
    if (input.config !== undefined) { sets.push(`config = $${idx}`); params.push(input.config ? JSON.stringify(input.config) : null); idx++; }

    const { rows } = await withPgErrorTranslation(() =>
      this.conn(client).query<FieldRow>(
        `UPDATE ${TABLE} SET ${sets.join(', ')} WHERE master_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
        params,
      ),
    );
    return toField(rows[0]!);
  }

  async softDelete(masterId: string, id: string, client?: PgClient): Promise<boolean> {
    const { rowCount } = await this.conn(client).query(
      `UPDATE ${TABLE} SET deleted_at = NOW() WHERE master_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [masterId, id],
    );
    return (rowCount ?? 0) > 0;
  }
}
