import type { PgPool } from '@maw/database';

export interface FileMetadataRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly storageKey: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly uploadedBy: string | null;
  readonly url: string | null;
  readonly createdAt: string;
  readonly deletedAt: string | null;
}

interface FileMetadataDbRow {
  id: string;
  tenant_id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: string;
  uploaded_by: string | null;
  url: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

function toRecord(row: FileMetadataDbRow): FileMetadataRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storageKey: row.storage_key,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedBy: row.uploaded_by,
    url: row.url,
    createdAt: row.created_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
  };
}

const COLUMNS = `id, tenant_id, storage_key, original_name, mime_type, size_bytes,
  uploaded_by, url, created_at, deleted_at`;

export class PgFileMetadataStore {
  constructor(private readonly pool: PgPool) {}

  async record(input: {
    tenantId: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy?: string;
    url?: string;
  }): Promise<FileMetadataRecord> {
    const { rows } = await this.pool.query<FileMetadataDbRow>(
      `INSERT INTO file_metadata (tenant_id, storage_key, original_name, mime_type, size_bytes, uploaded_by, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COLUMNS}`,
      [input.tenantId, input.storageKey, input.originalName, input.mimeType, input.sizeBytes, input.uploadedBy ?? null, input.url ?? null],
    );
    return toRecord(rows[0]!);
  }

  async findByKey(storageKey: string): Promise<FileMetadataRecord | null> {
    const { rows } = await this.pool.query<FileMetadataDbRow>(
      `SELECT ${COLUMNS} FROM file_metadata WHERE storage_key = $1 AND deleted_at IS NULL`,
      [storageKey],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async listByTenant(tenantId: string, limit = 100): Promise<FileMetadataRecord[]> {
    const { rows } = await this.pool.query<FileMetadataDbRow>(
      `SELECT ${COLUMNS} FROM file_metadata WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map(toRecord);
  }

  async softDelete(storageKey: string): Promise<void> {
    await this.pool.query(
      `UPDATE file_metadata SET deleted_at = NOW() WHERE storage_key = $1 AND deleted_at IS NULL`,
      [storageKey],
    );
  }
}
