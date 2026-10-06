<?php

declare(strict_types=1);

namespace App\Storage\Core;

/** Decrypted, provider-ready view of a tenant configuration. Lives only in memory. */
final readonly class ProviderRuntimeConfig
{
    public function __construct(
        public string $configId,
        public string $tenantId,
        public string $providerType,
        public ?string $bucketName,
        public ?string $region,
        public ?string $endpoint,
        public string $basePath,
        /** S3/R2 access key id, or Azure storage account name. */
        public ?string $accessKeyId = null,
        /** S3/R2 secret, or Azure account key. */
        public ?string $secretAccessKey = null,
    ) {}
}
