<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Auth\TokenBlacklistInterface;
use Illuminate\Support\Facades\Cache;

final class DatabaseTokenBlacklist implements TokenBlacklistInterface
{
    private const PREFIX = 'token_blacklist:';

    public function add(string $jti, int $expiresAt): void
    {
        $ttl = max(0, $expiresAt - time());
        Cache::put(self::PREFIX . $jti, true, $ttl);
    }

    public function isBlacklisted(string $jti): bool
    {
        return Cache::has(self::PREFIX . $jti);
    }
}
