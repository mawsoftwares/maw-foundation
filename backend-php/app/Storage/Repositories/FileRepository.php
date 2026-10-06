<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageFile;

interface FileRepository
{
    /**
     * @param array<string, mixed> $row id,tenantId,storageConfigId,folderId,originalName,objectKey,mimeType,extension,fileSize,uploadedBy
     */
    public function create(array $row): StorageFile;

    /**
     * Active (not soft-deleted) file scoped to the tenant.
     *
     * @phpstan-impure reads mutable state — two calls around a write can differ
     */
    public function findById(string $tenantId, string $id): ?StorageFile;

    /** pending/uploading → uploaded. `null` if the file is not in an uploadable state. */
    public function markUploaded(string $tenantId, string $id, ?string $checksum): ?StorageFile;

    /** pending/uploading → failed. */
    public function markFailed(string $tenantId, string $id): ?StorageFile;

    /** Hides the file (sets deleted_at) but keeps its status until the object is removed. */
    public function softDelete(string $tenantId, string $id): ?StorageFile;

    /** Final step of deletion once the provider object is gone. */
    public function markDeleted(string $tenantId, string $id): void;

    /**
     * @param array<string, mixed> $query validated by Validator::listQuery() `folderId` null ⇒ root
     * @return array{items: list<StorageFile>, total: int}
     */
    public function listUploadedInFolder(string $tenantId, array $query): array;

    /**
     * For the cleanup job (system-level, intentionally not tenant-scoped).
     *
     * @return list<StorageFile>
     */
    public function listStalePending(\DateTimeInterface $olderThan, int $limit): array;

    /**
     * For the cleanup job: soft-deleted files whose provider object may still exist.
     *
     * @return list<StorageFile>
     */
    public function listPendingObjectDeletion(int $limit): array;
}
