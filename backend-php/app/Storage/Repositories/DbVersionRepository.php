<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageFile;
use Illuminate\Support\Facades\DB;

final class DbVersionRepository implements VersionRepository
{
    public function createForFile(StorageFile $file, ?string $createdBy): int
    {
        $row = DB::selectOne(
            'INSERT INTO maw_storage_file_versions (file_id, version_number, object_key, file_size, mime_type, checksum, created_by)
             SELECT ?, COALESCE(MAX(version_number), 0) + 1, ?, ?, ?, ?, ?
               FROM maw_storage_file_versions WHERE file_id = ?
             RETURNING version_number',
            [$file->id, $file->objectKey, $file->fileSize, $file->mimeType, $file->checksum, $createdBy, $file->id],
        );

        return (int) ($row->version_number ?? 0);
    }
}
