<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageFile;
use Illuminate\Support\Facades\DB;

final class DbFileRepository implements FileRepository
{
    use DbSupport;

    private const COLUMNS = 'id, tenant_id, storage_config_id, folder_id, original_name, object_key, mime_type, extension,
        file_size, checksum, status, visibility, uploaded_by, created_at, updated_at, deleted_at';
    private const SORTABLE = ['name' => 'lower(original_name)', 'size' => 'file_size', 'createdAt' => 'created_at'];

    public function create(array $row): StorageFile
    {
        $created = DB::selectOne(
            'INSERT INTO maw_storage_files
               (id, tenant_id, storage_config_id, folder_id, original_name, object_key, mime_type, extension, file_size, uploaded_by)
             VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING ' . self::COLUMNS,
            [$row['id'], $row['tenantId'], $row['storageConfigId'], $row['folderId'], $row['originalName'], $row['objectKey'], $row['mimeType'], $row['extension'], $row['fileSize'], $row['uploadedBy']],
        );

        return $this->map($created);
    }

    public function findById(string $tenantId, string $id): ?StorageFile
    {
        return $this->one('SELECT ' . self::COLUMNS . ' FROM maw_storage_files WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL', [$tenantId, $id]);
    }

    public function markUploaded(string $tenantId, string $id, ?string $checksum): ?StorageFile
    {
        return $this->one(
            "UPDATE maw_storage_files SET status = 'uploaded', checksum = ?, updated_at = NOW()
              WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL AND status IN ('pending','uploading') RETURNING " . self::COLUMNS,
            [$checksum, $tenantId, $id],
        );
    }

    public function markFailed(string $tenantId, string $id): ?StorageFile
    {
        return $this->one(
            "UPDATE maw_storage_files SET status = 'failed', updated_at = NOW()
              WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL AND status IN ('pending','uploading') RETURNING " . self::COLUMNS,
            [$tenantId, $id],
        );
    }

    public function softDelete(string $tenantId, string $id): ?StorageFile
    {
        return $this->one(
            'UPDATE maw_storage_files SET deleted_at = NOW(), updated_at = NOW() WHERE tenant_id = ? AND id = ? AND deleted_at IS NULL RETURNING ' . self::COLUMNS,
            [$tenantId, $id],
        );
    }

    public function markDeleted(string $tenantId, string $id): void
    {
        DB::update("UPDATE maw_storage_files SET status = 'deleted', updated_at = NOW() WHERE tenant_id = ? AND id = ?", [$tenantId, $id]);
    }

    public function listUploadedInFolder(string $tenantId, array $query): array
    {
        $where = ['tenant_id = ?', 'deleted_at IS NULL', "status = 'uploaded'"];
        $values = [$tenantId];
        if ($query['folderId'] === null) {
            $where[] = 'folder_id IS NULL';
        } else {
            $where[] = 'folder_id = ?';
            $values[] = $query['folderId'];
        }
        if (isset($query['search']) && $query['search'] !== '') {
            $where[] = 'original_name ILIKE ?';
            $values[] = self::likeContains($query['search']);
        }
        $clause = implode(' AND ', $where);
        $total = (int) (DB::selectOne("SELECT COUNT(*) AS n FROM maw_storage_files WHERE {$clause}", $values)->n ?? 0);
        $limit = (int) $query['pageSize'];
        $offset = ((int) $query['page'] - 1) * $limit;
        $rows = DB::select(
            'SELECT ' . self::COLUMNS . " FROM maw_storage_files WHERE {$clause} ORDER BY "
            . self::orderBy($query['sortBy'] ?? null, $query['sortDir'] ?? null, self::SORTABLE, 'lower(original_name)') . " LIMIT {$limit} OFFSET {$offset}",
            $values,
        );

        return ['items' => array_values(array_map($this->map(...), $rows)), 'total' => $total];
    }

    public function listStalePending(\DateTimeInterface $olderThan, int $limit): array
    {
        $rows = DB::select(
            "SELECT " . self::COLUMNS . " FROM maw_storage_files
              WHERE status IN ('pending','uploading') AND deleted_at IS NULL AND created_at < ?
              ORDER BY created_at LIMIT " . (int) $limit,
            [$olderThan->format('Y-m-d H:i:sP')],
        );

        return array_values(array_map($this->map(...), $rows));
    }

    public function listPendingObjectDeletion(int $limit): array
    {
        $rows = DB::select(
            "SELECT " . self::COLUMNS . " FROM maw_storage_files WHERE deleted_at IS NOT NULL AND status <> 'deleted' ORDER BY deleted_at LIMIT " . (int) $limit,
        );

        return array_values(array_map($this->map(...), $rows));
    }

    /**
     * @param list<mixed> $bindings
     */
    private function one(string $sql, array $bindings): ?StorageFile
    {
        $row = DB::selectOne($sql, $bindings);

        return $row === null ? null : $this->map($row);
    }

    private function map(\stdClass $r): StorageFile
    {
        return new StorageFile(
            $r->id, $r->tenant_id, $r->storage_config_id, $r->folder_id, $r->original_name, $r->object_key, $r->mime_type,
            $r->extension, (int) $r->file_size, $r->checksum, $r->status, $r->visibility, $r->uploaded_by,
            self::iso($r->created_at), self::iso($r->updated_at), self::isoOrNull($r->deleted_at),
        );
    }
}
