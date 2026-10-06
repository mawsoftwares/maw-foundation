import type { PgPool } from '@mawsoftwares/database';
import type { PageRequest, PageResult, SortDirection, StorageFile, StorageFileStatus } from '../types/storage.types';
import { likeContains, offsetOf, orderBy, toIso, toIsoOrNull } from './pg.util';

export interface NewFile {
  readonly id: string;
  readonly tenantId: string;
  readonly storageConfigId: string;
  readonly folderId: string | null;
  readonly originalName: string;
  readonly objectKey: string;
  readonly mimeType: string;
  readonly extension: string;
  readonly fileSize: number;
  readonly uploadedBy: string | null;
}

export interface FileListQuery extends PageRequest {
  /** `null` ⇒ files at the root (no folder). */
  readonly folderId: string | null;
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortDir?: SortDirection;
}

export interface IStorageFileRepository {
  create(file: NewFile): Promise<StorageFile>;
  /** Active (not soft-deleted) file scoped to the tenant. */
  findById(tenantId: string, id: string): Promise<StorageFile | null>;
  /** pending/uploading → uploaded. Returns `null` if the file is not in an uploadable state. */
  markUploaded(tenantId: string, id: string, checksum: string | null): Promise<StorageFile | null>;
  /** pending/uploading → failed. */
  markFailed(tenantId: string, id: string): Promise<StorageFile | null>;
  /** Hides the file (sets deleted_at) but keeps its status until the object is removed. */
  softDelete(tenantId: string, id: string): Promise<StorageFile | null>;
  /** Final step of deletion once the provider object is gone. */
  markDeleted(tenantId: string, id: string): Promise<void>;
  listUploadedInFolder(tenantId: string, query: FileListQuery): Promise<PageResult<StorageFile>>;
  /** For the cleanup job (system-level, intentionally not tenant-scoped): abandoned uploads. */
  listStalePending(olderThan: Date, limit: number): Promise<StorageFile[]>;
  /** For the cleanup job: soft-deleted files whose provider object may still exist. */
  listPendingObjectDeletion(limit: number): Promise<StorageFile[]>;
}

interface FileRow {
  id: string;
  tenant_id: string;
  storage_config_id: string;
  folder_id: string | null;
  original_name: string;
  object_key: string;
  mime_type: string;
  extension: string;
  file_size: string | number;
  checksum: string | null;
  status: StorageFileStatus;
  visibility: 'private';
  uploaded_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

const COLUMNS = `id, tenant_id, storage_config_id, folder_id, original_name, object_key, mime_type, extension,
  file_size, checksum, status, visibility, uploaded_by, created_at, updated_at, deleted_at`;
const SORTABLE = { name: 'lower(original_name)', size: 'file_size', createdAt: 'created_at' } as const;

function toFile(row: FileRow): StorageFile {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storageConfigId: row.storage_config_id,
    folderId: row.folder_id,
    originalName: row.original_name,
    objectKey: row.object_key,
    mimeType: row.mime_type,
    extension: row.extension,
    fileSize: Number(row.file_size),
    checksum: row.checksum,
    status: row.status,
    visibility: row.visibility,
    uploadedBy: row.uploaded_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: toIsoOrNull(row.deleted_at),
  };
}

export class PgStorageFileRepository implements IStorageFileRepository {
  constructor(private readonly db: PgPool) {}

  async create(file: NewFile): Promise<StorageFile> {
    const { rows } = await this.db.query<FileRow>(
      `INSERT INTO maw_storage_files
         (id, tenant_id, storage_config_id, folder_id, original_name, object_key, mime_type, extension, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING ${COLUMNS}`,
      [file.id, file.tenantId, file.storageConfigId, file.folderId, file.originalName, file.objectKey, file.mimeType, file.extension, file.fileSize, file.uploadedBy],
    );
    return toFile(rows[0]!);
  }

  async findById(tenantId: string, id: string): Promise<StorageFile | null> {
    const { rows } = await this.db.query<FileRow>(
      `SELECT ${COLUMNS} FROM maw_storage_files WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return rows[0] ? toFile(rows[0]) : null;
  }

  async markUploaded(tenantId: string, id: string, checksum: string | null): Promise<StorageFile | null> {
    const { rows } = await this.db.query<FileRow>(
      `UPDATE maw_storage_files SET status = 'uploaded', checksum = $3, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL AND status IN ('pending','uploading')
        RETURNING ${COLUMNS}`,
      [tenantId, id, checksum],
    );
    return rows[0] ? toFile(rows[0]) : null;
  }

  async markFailed(tenantId: string, id: string): Promise<StorageFile | null> {
    const { rows } = await this.db.query<FileRow>(
      `UPDATE maw_storage_files SET status = 'failed', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL AND status IN ('pending','uploading')
        RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    return rows[0] ? toFile(rows[0]) : null;
  }

  async softDelete(tenantId: string, id: string): Promise<StorageFile | null> {
    const { rows } = await this.db.query<FileRow>(
      `UPDATE maw_storage_files SET deleted_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    return rows[0] ? toFile(rows[0]) : null;
  }

  async markDeleted(tenantId: string, id: string): Promise<void> {
    await this.db.query(
      `UPDATE maw_storage_files SET status = 'deleted', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id],
    );
  }

  async listUploadedInFolder(tenantId: string, query: FileListQuery): Promise<PageResult<StorageFile>> {
    const where = [
      'tenant_id = $1',
      'deleted_at IS NULL',
      `status = 'uploaded'`,
      query.folderId === null ? 'folder_id IS NULL' : 'folder_id = $2',
    ];
    const values: unknown[] = query.folderId === null ? [tenantId] : [tenantId, query.folderId];
    if (query.search) {
      values.push(likeContains(query.search));
      where.push(`original_name ILIKE $${values.length}`);
    }
    const clause = where.join(' AND ');
    const count = await this.db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM maw_storage_files WHERE ${clause}`, values);
    const { rows } = await this.db.query<FileRow>(
      `SELECT ${COLUMNS} FROM maw_storage_files WHERE ${clause}
        ORDER BY ${orderBy(query.sortBy, query.sortDir, SORTABLE, 'lower(original_name)')}
        LIMIT ${query.pageSize} OFFSET ${offsetOf(query)}`,
      values,
    );
    return { items: rows.map(toFile), total: Number(count.rows[0]?.n ?? 0) };
  }

  async listStalePending(olderThan: Date, limit: number): Promise<StorageFile[]> {
    const { rows } = await this.db.query<FileRow>(
      `SELECT ${COLUMNS} FROM maw_storage_files
        WHERE status IN ('pending','uploading') AND deleted_at IS NULL AND created_at < $1
        ORDER BY created_at LIMIT $2`,
      [olderThan, limit],
    );
    return rows.map(toFile);
  }

  async listPendingObjectDeletion(limit: number): Promise<StorageFile[]> {
    const { rows } = await this.db.query<FileRow>(
      `SELECT ${COLUMNS} FROM maw_storage_files
        WHERE deleted_at IS NOT NULL AND status <> 'deleted'
        ORDER BY deleted_at LIMIT $1`,
      [limit],
    );
    return rows.map(toFile);
  }
}
