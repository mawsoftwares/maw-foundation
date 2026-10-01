<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Auth\SessionRepositoryInterface;
use App\Infrastructure\Persistence\Eloquent\Models\UserSessionModel;
use Illuminate\Support\Str;

final class EloquentSessionRepository implements SessionRepositoryInterface
{
    /**
     * @param array<string, mixed> $metadata
     */
    public function create(
        string $tenantId,
        string $userId,
        string $refreshTokenHash,
        array $metadata = [],
    ): string {
        $id = Str::uuid()->toString();

        UserSessionModel::create([
            'id' => $id,
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'refresh_token_hash' => $refreshTokenHash,
            'ip_address' => $metadata['ipAddress'] ?? '0.0.0.0',
            'user_agent' => $metadata['userAgent'] ?? 'unknown',
            'last_used_at' => now(),
        ]);

        return $id;
    }

    public function revoke(string $sessionId): bool
    {
        return (bool) UserSessionModel::where('id', $sessionId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    public function revokeOwned(string $sessionId, string $tenantId, string $userId): bool
    {
        return (bool) UserSessionModel::where('id', $sessionId)
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listForUser(string $tenantId, string $userId): array
    {
        return UserSessionModel::where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->whereNull('revoked_at')
            ->orderBy('last_used_at', 'desc')
            ->get()
            ->map(fn (UserSessionModel $s) => [
                'id' => $s->id,
                'ipAddress' => $s->ip_address,
                'userAgent' => $s->user_agent,
                'createdAt' => $s->created_at?->toIso8601String(),
                'lastUsedAt' => $s->last_used_at?->toIso8601String(),
            ])
            ->all();
    }

    public function revokeAllForUser(string $tenantId, string $userId): int
    {
        return UserSessionModel::where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findByRefreshTokenHash(string $hash): ?array
    {
        $session = UserSessionModel::where('refresh_token_hash', $hash)
            ->whereNull('revoked_at')
            ->first();

        if (! $session) {
            return null;
        }

        return [
            'id' => $session->id,
            'tenantId' => $session->tenant_id,
            'userId' => $session->user_id,
            'refreshTokenHash' => $session->refresh_token_hash,
            'ipAddress' => $session->ip_address,
            'userAgent' => $session->user_agent,
        ];
    }
}
