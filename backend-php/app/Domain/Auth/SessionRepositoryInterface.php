<?php

declare(strict_types=1);

namespace App\Domain\Auth;

interface SessionRepositoryInterface
{
    /**
     * @param array<string, mixed> $metadata
     */
    public function create(
        string $tenantId,
        string $userId,
        string $refreshTokenHash,
        array $metadata = [],
    ): string;

    public function revoke(string $sessionId): bool;

    public function revokeOwned(string $sessionId, string $tenantId, string $userId): bool;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listForUser(string $tenantId, string $userId): array;

    public function revokeAllForUser(string $tenantId, string $userId): int;

    /**
     * @return array<string, mixed>|null
     */
    public function findByRefreshTokenHash(string $hash): ?array;
}
