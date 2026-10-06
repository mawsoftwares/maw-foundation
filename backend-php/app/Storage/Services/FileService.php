<?php

declare(strict_types=1);

namespace App\Storage\Services;

use App\Storage\Core\Actor;
use App\Storage\Core\Errors;
use App\Storage\Core\StorageFile;
use App\Storage\Repositories\FileRepository;
use Illuminate\Support\Facades\Log;

/** File details, listing and deletion. */
final class FileService
{
    public function __construct(
        private readonly FileRepository $files,
        private readonly FolderService $folders,
        private readonly ConfigurationService $configurations,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function getFile(string $tenantId, string $fileId): array
    {
        return ($this->files->findById($tenantId, $fileId) ?? throw Errors::fileNotFound())->toView();
    }

    /**
     * @param array<string, mixed> $query validated by Validator::listQuery()
     * @return array{items: list<array<string, mixed>>, total: int}
     */
    public function listFiles(string $tenantId, array $query): array
    {
        if ($query['folderId'] !== null) {
            $this->folders->require($tenantId, $query['folderId']);
        }
        $result = $this->files->listUploadedInFolder($tenantId, $query);

        return ['items' => array_map(static fn (StorageFile $f): array => $f->toView(), $result['items']), 'total' => $result['total']];
    }

    /**
     * Soft-deletes first (the file disappears from every API), then removes the object. If the provider call
     * fails the row keeps `deleted_at` set with its previous status, which is exactly what the cleanup job
     * selects for a retry — nothing is left half-visible.
     */
    public function deleteFile(Actor $actor, string $fileId): void
    {
        $tenantId = $actor->tenantId;
        $file = $this->files->softDelete($tenantId, $fileId) ?? throw Errors::fileNotFound();
        try {
            [, $provider] = $this->configurations->resolve($tenantId, $file->storageConfigId, true);
            $provider->deleteObject($file->objectKey);
            $this->files->markDeleted($tenantId, $fileId);
            Log::info('File deleted', ['tenantId' => $tenantId, 'fileId' => $fileId, 'by' => $actor->userId]);
        } catch (\Throwable) {
            Log::error('Object deletion failed; queued for cleanup', ['tenantId' => $tenantId, 'fileId' => $fileId]);
        }
    }
}
