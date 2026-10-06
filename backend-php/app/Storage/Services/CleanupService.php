<?php

declare(strict_types=1);

namespace App\Storage\Services;

use App\Storage\Repositories\FileRepository;
use Illuminate\Support\Facades\Log;

/**
 * System-level maintenance (runs outside any request, so it is the one place that reads across tenants — each
 * file is then handled strictly with its own tenant id).
 *  1. Abandoned uploads: remove any partial object, mark the record `failed`.
 *  2. Interrupted deletions: retry the provider delete for soft-deleted files, then mark `deleted`.
 * Idempotent and safe to run concurrently with normal traffic.
 */
final class CleanupService
{
    public function __construct(
        private readonly FileRepository $files,
        private readonly ConfigurationService $configurations,
    ) {}

    /**
     * @return array{abandonedUploads: int, retriedDeletions: int, errors: int}
     */
    public function run(int $pendingOlderThanHours = 24, int $batchSize = 200): array
    {
        $abandoned = 0;
        $retried = 0;
        $errors = 0;

        $cutoff = (new \DateTimeImmutable())->modify("-{$pendingOlderThanHours} hours");
        foreach ($this->files->listStalePending($cutoff, $batchSize) as $file) {
            try {
                [, $provider] = $this->configurations->resolve($file->tenantId, $file->storageConfigId, true);
                $provider->deleteObject($file->objectKey);
                $this->files->markFailed($file->tenantId, $file->id);
                $abandoned++;
            } catch (\Throwable) {
                $errors++;
                Log::error('Could not clean up abandoned upload', ['tenantId' => $file->tenantId, 'fileId' => $file->id]);
            }
        }

        foreach ($this->files->listPendingObjectDeletion($batchSize) as $file) {
            try {
                [, $provider] = $this->configurations->resolve($file->tenantId, $file->storageConfigId, true);
                $provider->deleteObject($file->objectKey);
                $this->files->markDeleted($file->tenantId, $file->id);
                $retried++;
            } catch (\Throwable) {
                $errors++;
                Log::error('Could not retry object deletion', ['tenantId' => $file->tenantId, 'fileId' => $file->id]);
            }
        }

        Log::info('Storage cleanup finished', ['abandonedUploads' => $abandoned, 'retriedDeletions' => $retried, 'errors' => $errors]);

        return ['abandonedUploads' => $abandoned, 'retriedDeletions' => $retried, 'errors' => $errors];
    }
}
