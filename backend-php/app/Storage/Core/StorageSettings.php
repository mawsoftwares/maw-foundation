<?php

declare(strict_types=1);

namespace App\Storage\Core;

/** Module settings (see config/storage.php). Mirrors Node's `StorageModuleConfig` + `StorageLimits`. */
final readonly class StorageSettings
{
    /**
     * @param list<string> $allowedMimeTypes exact types or wildcards (`image/*`); empty ⇒ any well-formed type
     */
    public function __construct(
        public string $localRoot,
        public string $localSigningSecret,
        public string $publicBaseUrl,
        public string $encryptionKeyHex,
        public int $uploadUrlTtlSeconds = 900,
        public int $downloadUrlTtlSeconds = 300,
        public int $maxFileSizeBytes = 104857600,
        public array $allowedMimeTypes = [],
        public int $pendingUploadMaxAgeHours = 24,
    ) {}
}
