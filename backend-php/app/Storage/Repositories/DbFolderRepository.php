<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\Errors;
use App\Storage\Core\StorageFolder;
use Illuminate\Support\Facades\DB;

final class DbFolderRepository implements FolderRepository
{
    use DbSupport;

    private const COLUMNS = 'id, tenant_id, storage_config_id, parent_id, name, path, created_by, created_at, updated_at, deleted_at';
    private const SORTABLE = ['name' => 'lower(name)', 'createdAt' => 'created_at', 'updatedAt' => 'updated_at'];

    public function findById(string $tenantId, string $id): ?StorageFolder
    {
        $row = DB::selectOne('SELECT ' . self::COLUMNS . ' FROM maw_storage_folders WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL', [$tenantId, $id]);

        return $row === null ? null : $this->map($row);
    }

    public function list(string $tenantId, array $query): array
    {
        $where = ['tenant_id = ?', 'deleted_at IS NULL'];
        $values = [$tenantId];
        if ($query['parentId'] === null) {
            $where[] = 'parent_id IS NULL';
        } else {
            $where[] = 'parent_id = ?';
            $values[] = $query['parentId'];
        }
        if (isset($query['search']) && $query['search'] !== '') {
            $where[] = 'name ILIKE ?';
            $values[] = self::likeContains($query['search']);
        }
        $clause = implode(' AND ', $where);
        $total = (int) (DB::selectOne("SELECT COUNT(*) AS n FROM maw_storage_folders WHERE {$clause}", $values)->n ?? 0);
        $limit = (int) $query['pageSize'];
        $offset = ((int) $query['page'] - 1) * $limit;
        $rows = DB::select(
            'SELECT ' . self::COLUMNS . " FROM maw_storage_folders WHERE {$clause} ORDER BY "
            . self::orderBy($query['sortBy'] ?? null, $query['sortDir'] ?? null, self::SORTABLE, 'lower(name)') . " LIMIT {$limit} OFFSET {$offset}",
            $values,
        );

        return ['items' => array_values(array_map($this->map(...), $rows)), 'total' => $total];
    }

    public function findSibling(string $tenantId, string $storageConfigId, ?string $parentId, string $name): ?StorageFolder
    {
        $row = DB::selectOne(
            'SELECT ' . self::COLUMNS . ' FROM maw_storage_folders
              WHERE tenant_id = ? AND storage_config_id = ? AND deleted_at IS NULL
                AND parent_id IS NOT DISTINCT FROM ?::uuid AND lower(name) = lower(?)',
            [$tenantId, $storageConfigId, $parentId, $name],
        );

        return $row === null ? null : $this->map($row);
    }

    public function create(array $row): StorageFolder
    {
        try {
            $created = DB::selectOne(
                'INSERT INTO maw_storage_folders (id, tenant_id, storage_config_id, parent_id, name, path, created_by)
                 VALUES (?,?,?,?,?,?,?) RETURNING ' . self::COLUMNS,
                [$row['id'], $row['tenantId'], $row['storageConfigId'], $row['parentId'], $row['name'], $row['path'], $row['createdBy']],
            );
        } catch (\Throwable $e) {
            throw self::isUniqueViolation($e) ? Errors::conflict('A folder with this name already exists here') : $e;
        }

        return $this->map($created);
    }

    public function update(string $tenantId, string $id, string $name, ?string $parentId, string $path): ?StorageFolder
    {
        try {
            $row = DB::selectOne(
                'UPDATE maw_storage_folders SET name = ?, parent_id = ?, path = ?, updated_at = NOW()
                  WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL RETURNING ' . self::COLUMNS,
                [$name, $parentId, $path, $tenantId, $id],
            );
        } catch (\Throwable $e) {
            throw self::isUniqueViolation($e) ? Errors::conflict('A folder with this name already exists here') : $e;
        }

        return $row === null ? null : $this->map($row);
    }

    public function rewriteDescendantPaths(string $tenantId, string $oldPath, string $newPath): void
    {
        DB::update(
            "UPDATE maw_storage_folders SET path = ?::text || substr(path, char_length(?::text) + 1), updated_at = NOW()
              WHERE tenant_id = ? AND deleted_at IS NULL AND starts_with(path, ?::text || '/')",
            [$newPath, $oldPath, $tenantId, $oldPath],
        );
    }

    public function ancestorIds(string $tenantId, string $id): array
    {
        $rows = DB::select(
            'WITH RECURSIVE chain(id, parent_id, depth) AS (
               SELECT id, parent_id, 1 FROM maw_storage_folders WHERE tenant_id = ? AND id = ?
               UNION ALL
               SELECT f.id, f.parent_id, c.depth + 1 FROM maw_storage_folders f
                 JOIN chain c ON f.id = c.parent_id WHERE f.tenant_id = ? AND c.depth < 64
             ) SELECT id FROM chain ORDER BY depth',
            [$tenantId, $id, $tenantId],
        );

        return array_values(array_map(static fn (\stdClass $r): string => (string) $r->id, $rows));
    }

    public function countChildren(string $tenantId, string $id): array
    {
        $row = DB::selectOne(
            'SELECT (SELECT COUNT(*) FROM maw_storage_folders WHERE tenant_id = ? AND parent_id = ? AND deleted_at IS NULL) AS folders,
                    (SELECT COUNT(*) FROM maw_storage_files   WHERE tenant_id = ? AND folder_id = ?  AND deleted_at IS NULL) AS files',
            [$tenantId, $id, $tenantId, $id],
        );

        return ['folders' => (int) ($row->folders ?? 0), 'files' => (int) ($row->files ?? 0)];
    }

    public function softDelete(string $tenantId, string $id): bool
    {
        return DB::update('UPDATE maw_storage_folders SET deleted_at = NOW(), updated_at = NOW() WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL', [$tenantId, $id]) > 0;
    }

    private function map(\stdClass $r): StorageFolder
    {
        return new StorageFolder(
            $r->id, $r->tenant_id, $r->storage_config_id, $r->parent_id, $r->name, $r->path, $r->created_by,
            self::iso($r->created_at), self::iso($r->updated_at), self::isoOrNull($r->deleted_at),
        );
    }
}
