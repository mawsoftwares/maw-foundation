<?php

declare(strict_types=1);

namespace App\Storage\Repositories;

use App\Storage\Core\StorageConfig;

/**
 * Repository contracts. Every method that touches tenant data takes `$tenantId` and filters on it;
 * implementations must never return another tenant's rows (the services rely on that for 404-not-403).
 */
interface ConfigRepository
{
    /**
     * @return array{id: string, code: string, name: string, providerType: string, isActive: bool}|null
     */
    public function findProviderByType(string $type): ?array;

    /**
     * @return list<StorageConfig>
     */
    public function list(string $tenantId): array;

    public function findById(string $tenantId, string $id): ?StorageConfig;

    public function findDefault(string $tenantId): ?StorageConfig;

    /**
     * @param array<string, mixed> $row id,tenantId,providerId,name,bucketName,region,endpoint,basePath,encryptedCredentials
     */
    public function create(array $row): StorageConfig;

    /**
     * @param array<string, mixed> $patch name,bucketName,region,endpoint,basePath,encryptedCredentials,isActive
     */
    public function update(string $tenantId, string $id, array $patch): ?StorageConfig;

    /** Atomically makes `$id` the tenant's only default. */
    public function setDefault(string $tenantId, string $id): void;

    public function delete(string $tenantId, string $id): bool;

    public function countReferences(string $tenantId, string $id): int;
}
