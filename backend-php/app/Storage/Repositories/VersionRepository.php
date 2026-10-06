<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageFile;

interface VersionRepository
{
    /** Appends the next version number for the file (V1 only ever writes version 1). */
    public function createForFile(StorageFile $file, ?string $createdBy): int;
}
