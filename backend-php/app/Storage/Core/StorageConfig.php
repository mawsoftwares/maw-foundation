<?php

declare(strict_types=1);

namespace App\Storage\Core;

/** Persisted tenant configuration. `encryptedCredentials` must never leave the service layer. */
final readonly class StorageConfig
{
    public function __construct(
        public string $id,
        public string $tenantId,
        public string $providerId,
        public string $providerType,
        public string $name,
        public ?string $bucketName,
        public ?string $region,
        public ?string $endpoint,
        public string $basePath,
        public ?string $encryptedCredentials,
        public bool $isDefault,
        public bool $isActive,
        public string $createdAt,
        public string $updatedAt,
    ) {}

    /**
     * The only client-facing view of a configuration — credentials are never copied.
     *
     * @return array<string, mixed>
     */
    public function toView(): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->providerType,
            'name' => $this->name,
            'bucket' => $this->bucketName,
            'region' => $this->region,
            'endpoint' => $this->endpoint,
            'basePath' => $this->basePath,
            'hasCredentials' => $this->encryptedCredentials !== null,
            'isDefault' => $this->isDefault,
            'isActive' => $this->isActive,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
