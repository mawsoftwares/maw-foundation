import type { PgPool } from '@mawsoftwares/database';
import type { PageRequest, PageResult, SortDirection, StorageFolder } from '../types/storage.types';
import { isUniqueViolation, likeContains, offsetOf, orderBy, toIso, toIsoOrNull } from './pg.util';
import { storageErrors } from '../core/storage.errors';

export interface NewFolder {
  readonly id: string;
  readonly tenantId: string;
  readonly storageConfigId: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly path: string;
  readonly createdBy: string | null;
}

export interface FolderListQuery extends PageRequest {
  /** `null` ⇒ root folders. */
  readonly parentId: string | null;
  readonly search?: string;
  readonly sortBy?: string;
  readonly sortDir?: SortDirection;
}

export interface IStorageFolderRepository {
  findById(tenantId: string, id: string): Promise<StorageFolder | null>;
  list(tenantId: string, query: FolderListQuery): Promise<PageResult<StorageFolder>>;
  findSibling(tenantId: string, storageConfigId: string, parentId: string | null, name: string): Promise<StorageFolder | null>;
  create(folder: NewFolder): Promise<StorageFolder>;
  /** Renames/moves one folder row. Descendant paths are rewritten separately. */
  update(tenantId: string, id: string, patch: { name: string; parentId: string | null; path: string }): Promise<StorageFolder | null>;
  rewriteDescendantPaths(tenantId: string, oldPath: string, newPath: string): Promise<void>;
  /** Ids of `id` and all of its ancestors (nearest first). */
  ancestorIds(tenantId: string, id: string): Promise<string[]>;
  countChildren(tenantId: string, id: string): Promise<{ folders: number; files: number }>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}

interface FolderRow {
  id: string;
  tenant_id: string;
  storage_config_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  created_by: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

const COLUMNS = 'id, tenant_id, storage_config_id, parent_id, name, path, created_by, created_at, updated_at, deleted_at';
const SORTABLE = { name: 'lower(name)', createdAt: 'created_at', updatedAt: 'updated_at' } as const;

function toFolder(row: FolderRow): StorageFolder {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storageConfigId: row.storage_config_id,
    parentId: row.parent_id,
    name: row.name,
    path: row.path,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    deletedAt: toIsoOrNull(row.deleted_at),
  };
}

export class PgStorageFolderRepository implements IStorageFolderRepository {
  constructor(private readonly db: PgPool) {}

  async findById(tenantId: string, id: string): Promise<StorageFolder | null> {
    const { rows } = await this.db.query<FolderRow>(
      `SELECT ${COLUMNS} FROM maw_storage_folders WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return rows[0] ? toFolder(rows[0]) : null;
  }

  async list(tenantId: string, query: FolderListQuery): Promise<PageResult<StorageFolder>> {
    const where = ['tenant_id = $1', 'deleted_at IS NULL', query.parentId === null ? 'parent_id IS NULL' : 'parent_id = $2'];
    const values: unknown[] = query.parentId === null ? [tenantId] : [tenantId, query.parentId];
    if (query.search) {
      values.push(likeContains(query.search));
      where.push(`name ILIKE $${values.length}`);
    }
    const clause = where.join(' AND ');
    const count = await this.db.query<{ n: string }>(`SELECT COUNT(*) AS n FROM maw_storage_folders WHERE ${clause}`, values);
    const { rows } = await this.db.query<FolderRow>(
      `SELECT ${COLUMNS} FROM maw_storage_folders WHERE ${clause}
        ORDER BY ${orderBy(query.sortBy, query.sortDir, SORTABLE, 'lower(name)')}
        LIMIT ${query.pageSize} OFFSET ${offsetOf(query)}`,
      values,
    );
    return { items: rows.map(toFolder), total: Number(count.rows[0]?.n ?? 0) };
  }

  async findSibling(tenantId: string, storageConfigId: string, parentId: string | null, name: string): Promise<StorageFolder | null> {
    const { rows } = await this.db.query<FolderRow>(
      `SELECT ${COLUMNS} FROM maw_storage_folders
        WHERE tenant_id = $1 AND storage_config_id = $2 AND deleted_at IS NULL
          AND parent_id IS NOT DISTINCT FROM $3::uuid AND lower(name) = lower($4)`,
      [tenantId, storageConfigId, parentId, name],
    );
    return rows[0] ? toFolder(rows[0]) : null;
  }

  async create(folder: NewFolder): Promise<StorageFolder> {
    try {
      const { rows } = await this.db.query<FolderRow>(
        `INSERT INTO maw_storage_folders (id, tenant_id, storage_config_id, parent_id, name, path, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${COLUMNS}`,
        [folder.id, folder.tenantId, folder.storageConfigId, folder.parentId, folder.name, folder.path, folder.createdBy],
      );
      return toFolder(rows[0]!);
    } catch (err) {
      if (isUniqueViolation(err)) throw storageErrors.conflict('A folder with this name already exists here');
      throw err;
    }
  }

  async update(tenantId: string, id: string, patch: { name: string; parentId: string | null; path: string }): Promise<StorageFolder | null> {
    try {
      const { rows } = await this.db.query<FolderRow>(
        `UPDATE maw_storage_folders SET name = $3, parent_id = $4, path = $5, updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
        [tenantId, id, patch.name, patch.parentId, patch.path],
      );
      return rows[0] ? toFolder(rows[0]) : null;
    } catch (err) {
      if (isUniqueViolation(err)) throw storageErrors.conflict('A folder with this name already exists here');
      throw err;
    }
  }

  async rewriteDescendantPaths(tenantId: string, oldPath: string, newPath: string): Promise<void> {
    await this.db.query(
      `UPDATE maw_storage_folders SET path = $3 || substr(path, char_length($2) + 1), updated_at = NOW()
        WHERE tenant_id = $1 AND deleted_at IS NULL AND starts_with(path, $2 || '/')`,
      [tenantId, oldPath, newPath],
    );
  }

  async ancestorIds(tenantId: string, id: string): Promise<string[]> {
    const { rows } = await this.db.query<{ id: string }>(
      `WITH RECURSIVE chain(id, parent_id, depth) AS (
         SELECT id, parent_id, 1 FROM maw_storage_folders WHERE tenant_id = $1 AND id = $2
         UNION ALL
         SELECT f.id, f.parent_id, c.depth + 1 FROM maw_storage_folders f
           JOIN chain c ON f.id = c.parent_id WHERE f.tenant_id = $1 AND c.depth < 64
       ) SELECT id FROM chain ORDER BY depth`,
      [tenantId, id],
    );
    return rows.map((r) => r.id);
  }

  async countChildren(tenantId: string, id: string): Promise<{ folders: number; files: number }> {
    const { rows } = await this.db.query<{ folders: string; files: string }>(
      `SELECT (SELECT COUNT(*) FROM maw_storage_folders WHERE tenant_id = $1 AND parent_id = $2 AND deleted_at IS NULL) AS folders,
              (SELECT COUNT(*) FROM maw_storage_files   WHERE tenant_id = $1 AND folder_id = $2 AND deleted_at IS NULL) AS files`,
      [tenantId, id],
    );
    return { folders: Number(rows[0]?.folders ?? 0), files: Number(rows[0]?.files ?? 0) };
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `UPDATE maw_storage_folders SET deleted_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (rowCount ?? 0) > 0;
  }
}
