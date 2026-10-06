<?php

declare(strict_types=1);

namespace App\Storage\Services;

use App\Storage\Core\Actor;
use App\Storage\Core\Errors;
use App\Storage\Core\StorageFile;
use App\Storage\Core\StorageSettings;
use App\Storage\Repositories\FileRepository;
use Illuminate\Support\Facades\Log;

final class DownloadService
{
    public function __construct(
        private readonly FileRepository $files,
        private readonly ConfigurationService $configurations,
        private readonly StorageSettings $settings,
    ) {}

    /**
     * Short-lived signed URL; file bytes never pass through the API.
     *
     * @param 'attachment'|'inline' $disposition
     * @return array{url: string, expiresIn: int}
     */
    public function createDownloadUrl(Actor $actor, string $fileId, string $disposition = 'attachment'): array
    {
        $file = $this->files->findById($actor->tenantId, $fileId) ?? throw Errors::fileNotFound();
        if ($file->status !== StorageFile::UPLOADED) {
            throw Errors::uploadNotCompleted('The file is not available for download yet');
        }
        [, $provider] = $this->configurations->resolve($actor->tenantId, $file->storageConfigId);
        $result = $provider->createDownloadUrl($file->objectKey, $file->originalName, $file->mimeType, $disposition, $this->settings->downloadUrlTtlSeconds);
        Log::info('Download URL generated', ['tenantId' => $actor->tenantId, 'fileId' => $fileId]);

        return ['url' => $result->url, 'expiresIn' => $this->settings->downloadUrlTtlSeconds];
    }
}
