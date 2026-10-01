<?php

declare(strict_types=1);

namespace App\Domain\User;

use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;
use App\Domain\Shared\ValueObjects\UserId;

interface UserRepositoryInterface
{
    public function findById(UserId $id): ?UserEntity;

    public function findByEmail(TenantId $tenantId, Email $email): ?UserEntity;

    /**
     * @return UserEntity[]
     */
    public function listByTenant(TenantId $tenantId, int $page = 1, int $pageSize = 20): array;

    public function countByTenant(TenantId $tenantId): int;

    public function create(CreateUserData $data): UserEntity;

    public function updatePassword(UserId $id, string $passwordHash): void;

    public function updateStatus(UserId $id, string $status): void;

    public function updateEmailVerified(UserId $id, bool $verified): void;

    public function updateLastLogin(UserId $id, string $timestamp): void;
}
