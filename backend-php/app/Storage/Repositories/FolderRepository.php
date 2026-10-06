<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageFolder;

interface FolderRepository
{
    public function findById(string $tenantId, string $id): ?StorageFolder;

    /**
     * @param array<string, mixed> $query validated by Validator::listQuery() `parentId` null ⇒ root
     * @return array{items: list<StorageFolder>, total: int}
     */
    public function list(string $tenantId, array $query): array;

    public function findSibling(string $tenantId, string $storageConfigId, ?string $parentId, string $name): ?StorageFolder;

    /**
     * @param array<string, mixed> $row id,tenantId,storageConfigId,parentId,name,path,createdBy
     */
    public function create(array $row): StorageFolder;

    public function update(string $tenantId, string $id, string $name, ?string $parentId, string $path): ?StorageFolder;

    public function rewriteDescendantPaths(string $tenantId, string $oldPath, string $newPath): void;

    /**
     * Ids of `$id` and all of its ancestors (nearest first).
     *
     * @return list<string>
     */
    public function ancestorIds(string $tenantId, string $id): array;

    /**
     * @return array{folders: int, files: int}
     */
    public function countChildren(string $tenantId, string $id): array;

    public function softDelete(string $tenantId, string $id): bool;
}
