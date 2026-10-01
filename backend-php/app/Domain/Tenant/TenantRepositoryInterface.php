<?php

declare(strict_types=1);

namespace App\Domain\Tenant;

interface TenantRepositoryInterface
{
    /**
     * @return list<TenantEntity>
     */
    public function list(): array;

    public function findById(string $id): ?TenantEntity;

    /**
     * @param array<string, mixed>|null $settings
     */
    public function create(string $name, string $slug, ?string $domain, ?array $settings): TenantEntity;

    /**
     * @param array<string, mixed> $data
     */
    public function update(string $id, array $data): TenantEntity;

    public function delete(string $id): bool;
}
