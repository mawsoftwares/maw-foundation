<?php

declare(strict_types=1);

namespace App\Storage\Services;

use App\Storage\Core\Actor;
use App\Storage\Core\Errors;
use App\Storage\Core\StorageException;
use App\Storage\Core\StorageFile;
use App\Storage\Core\StorageSettings;
use App\Storage\Repositories\FileRepository;
use App\Storage\Repositories\VersionRepository;
use App\Storage\Util\ObjectKey;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class UploadService
{
    public function __construct(
        private readonly FileRepository $files,
        private readonly VersionRepository $versions,
        private readonly FolderService $folders,
        private readonly ConfigurationService $configurations,
        private readonly StorageSettings $settings,
    ) {}

    /**
     * Steps 4–11 of the lifecycle: validate, pick provider, create the pending record, sign the URL.
     *
     * @param array{folderId: ?string, fileName: string, contentType: string, fileSize: int} $request validated
     * @return array{fileId: string, uploadUrl: string, method: string, headers: array<string, string>, expiresIn: int}
     */
    public function requestUpload(Actor $actor, array $request): array
    {
        $tenantId = $actor->tenantId;
        $folder = $request['folderId'] !== null ? $this->folders->require($tenantId, $request['folderId']) : null;
        $configId = $folder->storageConfigId ?? $this->configurations->requireDefault($tenantId)->id;
        [, $provider] = $this->configurations->resolve($tenantId, $configId);

        $fileId = (string) Str::uuid();
        $objectKey = ObjectKey::build($tenantId, $folder?->id, $fileId);
        $this->files->create([
            'id' => $fileId,
            'tenantId' => $tenantId,
            'storageConfigId' => $configId,
            'folderId' => $folder?->id,
            'originalName' => $request['fileName'],
            'objectKey' => $objectKey,
            'mimeType' => $request['contentType'],
            'extension' => ObjectKey::extensionOf($request['fileName']),
            'fileSize' => $request['fileSize'],
            'uploadedBy' => $actor->userId,
        ]);

        $expires = $this->settings->uploadUrlTtlSeconds;
        try {
            $signed = $provider->createUploadUrl($objectKey, $request['contentType'], $request['fileSize'], $expires);
            Log::info('Upload requested', ['tenantId' => $tenantId, 'fileId' => $fileId, 'size' => $request['fileSize']]);

            return ['fileId' => $fileId, 'uploadUrl' => $signed->url, 'method' => $signed->method, 'headers' => $signed->headers, 'expiresIn' => $expires];
        } catch (\Throwable $e) {
            $this->files->markFailed($tenantId, $fileId);
            Log::error('Upload URL generation failed', ['tenantId' => $tenantId, 'fileId' => $fileId]);
            throw $e;
        }
    }

    /**
     * Steps 13–15: verify the object exists with the declared size/type, then mark it uploaded.
     * A missing object leaves the record `pending` (the client may still be uploading and can retry);
     * a mismatching object marks it `failed` and removes the stray object.
     *
     * @return array<string, mixed>
     */
    public function completeUpload(Actor $actor, string $fileId): array
    {
        $tenantId = $actor->tenantId;
        $file = $this->files->findById($tenantId, $fileId) ?? throw Errors::fileNotFound();
        if ($file->status === StorageFile::UPLOADED) {
            return $file->toView();
        }
        if ($file->status !== StorageFile::PENDING && $file->status !== StorageFile::UPLOADING) {
            throw Errors::uploadFailed('This upload can no longer be completed; request a new upload');
        }

        [, $provider] = $this->configurations->resolve($tenantId, $file->storageConfigId);
        try {
            $metadata = $provider->getObjectMetadata($file->objectKey);
        } catch (StorageException $e) {
            if ($e->reason === Errors::OBJECT_NOT_FOUND) {
                Log::warning('Upload completion requested before object exists', ['tenantId' => $tenantId, 'fileId' => $fileId]);
                throw Errors::uploadNotCompleted('The file has not been uploaded yet');
            }
            throw $e;
        }

        $sizeMismatch = $metadata->size !== $file->fileSize;
        $typeMismatch = $metadata->contentType !== null && self::mediaType($metadata->contentType) !== self::mediaType($file->mimeType);
        if ($sizeMismatch || $typeMismatch) {
            $this->files->markFailed($tenantId, $fileId);
            try {
                $provider->deleteObject($file->objectKey);
            } catch (\Throwable) {
                Log::error('Could not remove rejected object', ['tenantId' => $tenantId, 'fileId' => $fileId]);
            }
            Log::warning('Upload verification failed', ['tenantId' => $tenantId, 'fileId' => $fileId, 'sizeMismatch' => $sizeMismatch, 'typeMismatch' => $typeMismatch]);
            throw Errors::uploadFailed('The uploaded file does not match the declared size or type');
        }

        $updated = $this->files->markUploaded($tenantId, $fileId, $metadata->etag !== null ? str_replace('"', '', $metadata->etag) : null);
        if ($updated === null) {
            $current = $this->files->findById($tenantId, $fileId);
            if ($current?->status === StorageFile::UPLOADED) {
                return $current->toView();
            }
            throw Errors::uploadFailed('This upload can no longer be completed; request a new upload');
        }
        $this->versions->createForFile($updated, $actor->userId);
        Log::info('Upload completed', ['tenantId' => $tenantId, 'fileId' => $fileId, 'size' => $updated->fileSize]);

        return $updated->toView();
    }

    private static function mediaType(string $value): string
    {
        return strtolower(trim(explode(';', $value)[0]));
    }
}
