<?php

declare(strict_types=1);

namespace App\Domain\Auth;

final readonly class SessionEntity
{
    public function __construct(
        public string $id,
        public string $tenantId,
        public string $userId,
        public string $ipAddress,
        public string $userAgent,
        public \DateTimeImmutable $createdAt,
        public \DateTimeImmutable $lastUsedAt,
        public ?\DateTimeImmutable $revokedAt = null,
    ) {}

    public function isActive(): bool
    {
        return $this->revokedAt === null;
    }

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'ipAddress' => $this->ipAddress,
            'userAgent' => $this->userAgent,
            'createdAt' => $this->createdAt->format('c'),
            'lastUsedAt' => $this->lastUsedAt->format('c'),
            'current' => false,
        ];
    }
}
