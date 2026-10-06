import type { PgPool } from '@mawsoftwares/database';
import type { StorageFile, StorageFileVersion } from '../types/storage.types';
import { toIso } from './pg.util';

export interface IStorageFileVersionRepository {
  /** Appends the next version number for the file (V1 only ever writes version 1). */
  createForFile(file: StorageFile, createdBy: string | null): Promise<StorageFileVersion>;
  listByFile(tenantId: string, fileId: string): Promise<StorageFileVersion[]>;
}

interface VersionRow {
  id: string;
  file_id: string;
  version_number: number;
  object_key: string;
  file_size: string | number;
  mime_type: string;
  checksum: string | null;
  created_by: string | null;
  created_at: Date | string;
}

const COLUMNS = 'v.id, v.file_id, v.version_number, v.object_key, v.file_size, v.mime_type, v.checksum, v.created_by, v.created_at';

function toVersion(row: VersionRow): StorageFileVersion {
  return {
    id: row.id,
    fileId: row.file_id,
    versionNumber: row.version_number,
    objectKey: row.object_key,
    fileSize: Number(row.file_size),
    mimeType: row.mime_type,
    checksum: row.checksum,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
  };
}

export class PgStorageFileVersionRepository implements IStorageFileVersionRepository {
  constructor(private readonly db: PgPool) {}

  async createForFile(file: StorageFile, createdBy: string | null): Promise<StorageFileVersion> {
    const { rows } = await this.db.query<VersionRow>(
      `INSERT INTO maw_storage_file_versions (file_id, version_number, object_key, file_size, mime_type, checksum, created_by)
       SELECT $1, COALESCE(MAX(version_number), 0) + 1, $2, $3, $4, $5, $6
         FROM maw_storage_file_versions WHERE file_id = $1
       RETURNING id, file_id, version_number, object_key, file_size, mime_type, checksum, created_by, created_at`,
      [file.id, file.objectKey, file.fileSize, file.mimeType, file.checksum, createdBy],
    );
    return toVersion(rows[0]!);
  }

  async listByFile(tenantId: string, fileId: string): Promise<StorageFileVersion[]> {
    const { rows } = await this.db.query<VersionRow>(
      `SELECT ${COLUMNS} FROM maw_storage_file_versions v
         JOIN maw_storage_files f ON f.id = v.file_id
        WHERE f.tenant_id = $1 AND v.file_id = $2 ORDER BY v.version_number`,
      [tenantId, fileId],
    );
    return rows.map(toVersion);
  }
}
