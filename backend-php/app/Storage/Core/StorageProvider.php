<?php

declare(strict_types=1);

namespace App\Storage\Core;

/**
 * The only storage surface the rest of the application may touch. Provider-specific logic (SDKs, paths,
 * signing) lives strictly inside implementations. Keys are provider-relative; each provider applies its
 * own base path. Mirrors `StorageProvider` in the Node module.
 */
interface StorageProvider
{
    public function createUploadUrl(string $key, string $contentType, int $contentLength, int $expiresInSeconds): UploadUrl;

    /**
     * @param 'attachment'|'inline' $disposition
     */
    public function createDownloadUrl(string $key, string $fileName, string $contentType, string $disposition, int $expiresInSeconds): DownloadUrl;

    /** Idempotent. */
    public function deleteObject(string $key): void;

    public function objectExists(string $key): bool;

    /**
     * @throws \App\Storage\Core\StorageException STORAGE_OBJECT_NOT_FOUND when the object does not exist
     */
    public function getObjectMetadata(string $key): ObjectMetadata;

    /** Cheap reachability/permission probe used by "test configuration". Throws on failure. */
    public function verifyAccess(): void;
}
