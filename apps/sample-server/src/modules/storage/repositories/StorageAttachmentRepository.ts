import type { PgPool } from '@mawsoftwares/database';
import type { StorageAttachment } from '../types/storage.types';
import { toIso } from './pg.util';

export interface NewAttachment {
  readonly tenantId: string;
  readonly fileId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly category: string;
  readonly createdBy: string | null;
}

export interface IStorageAttachmentRepository {
  /** Idempotent: returns the existing row when the same link already exists. */
  create(input: NewAttachment): Promise<StorageAttachment>;
  listByEntity(tenantId: string, entityType: string, entityId: string, category?: string): Promise<StorageAttachment[]>;
  delete(tenantId: string, id: string): Promise<boolean>;
}

interface AttachmentRow {
  id: string;
  tenant_id: string;
  file_id: string;
  entity_type: string;
  entity_id: string;
  category: string;
  created_by: string | null;
  created_at: Date | string;
}

const COLUMNS = 'id, tenant_id, file_id, entity_type, entity_id, category, created_by, created_at';

function toAttachment(row: AttachmentRow): StorageAttachment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    fileId: row.file_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    category: row.category,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
  };
}

export class PgStorageAttachmentRepository implements IStorageAttachmentRepository {
  constructor(private readonly db: PgPool) {}

  async create(input: NewAttachment): Promise<StorageAttachment> {
    await this.db.query(
      `INSERT INTO maw_storage_attachments (tenant_id, file_id, entity_type, entity_id, category, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, file_id, entity_type, entity_id, category) DO NOTHING`,
      [input.tenantId, input.fileId, input.entityType, input.entityId, input.category, input.createdBy],
    );
    const { rows } = await this.db.query<AttachmentRow>(
      `SELECT ${COLUMNS} FROM maw_storage_attachments
        WHERE tenant_id = $1 AND file_id = $2 AND entity_type = $3 AND entity_id = $4 AND category = $5`,
      [input.tenantId, input.fileId, input.entityType, input.entityId, input.category],
    );
    return toAttachment(rows[0]!);
  }

  async listByEntity(tenantId: string, entityType: string, entityId: string, category?: string): Promise<StorageAttachment[]> {
    const values: unknown[] = [tenantId, entityType, entityId];
    let extra = '';
    if (category) {
      values.push(category);
      extra = ' AND category = $4';
    }
    const { rows } = await this.db.query<AttachmentRow>(
      `SELECT ${COLUMNS} FROM maw_storage_attachments
        WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3${extra} ORDER BY created_at`,
      values,
    );
    return rows.map(toAttachment);
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(`DELETE FROM maw_storage_attachments WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
    return (rowCount ?? 0) > 0;
  }
}
