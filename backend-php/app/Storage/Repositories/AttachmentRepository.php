<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageAttachment;

interface AttachmentRepository
{
    /**
     * Idempotent: returns the existing row when the same link already exists.
     *
     * @param array<string, mixed> $row
     */
    public function create(array $row): StorageAttachment;

    /**
     * @return list<StorageAttachment>
     */
    public function listByEntity(string $tenantId, string $entityType, string $entityId, ?string $category = null): array;

    public function delete(string $tenantId, string $id): bool;
}
