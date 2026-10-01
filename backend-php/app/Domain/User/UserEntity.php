<?php

declare(strict_types=1);

namespace App\Domain\User;

use App\Domain\Shared\Contracts\AccountStatus;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;
use App\Domain\Shared\ValueObjects\UserId;
use DateTimeImmutable;

final class UserEntity
{
    public function __construct(
        public readonly UserId $id,
        public readonly TenantId $tenantId,
        public readonly Email $email,
        public readonly string $passwordHash,
        public readonly string $role,
        public readonly string $audience,
        public readonly ?string $scopeId,
        public readonly AccountStatus $accountStatus,
        public readonly bool $emailVerified,
        public readonly bool $mfaEnabled,
        public readonly ?string $name,
        public readonly ?DateTimeImmutable $lastLoginAt,
        public readonly DateTimeImmutable $createdAt,
        public readonly DateTimeImmutable $updatedAt,
    ) {}

    public function isActive(): bool
    {
        return $this->accountStatus === AccountStatus::ACTIVE;
    }

    public function isLocked(): bool
    {
        return $this->accountStatus === AccountStatus::LOCKED;
    }

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id->value,
            'tenantId' => $this->tenantId->value,
            'email' => $this->email->value,
            'name' => $this->name,
            'role' => $this->role,
            'audience' => $this->audience,
            'scopeId' => $this->scopeId,
            'accountStatus' => $this->accountStatus->value,
            'emailVerified' => $this->emailVerified,
            'mfaEnabled' => $this->mfaEnabled,
            'lastLoginAt' => $this->lastLoginAt?->format(DateTimeImmutable::ATOM),
            'createdAt' => $this->createdAt->format(DateTimeImmutable::ATOM),
            'updatedAt' => $this->updatedAt->format(DateTimeImmutable::ATOM),
        ];
    }
}
