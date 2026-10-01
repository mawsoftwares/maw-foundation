<?php

declare(strict_types=1);

namespace App\Domain\Auth;

interface TokenBlacklistInterface
{
    public function add(string $jti, int $expiresAt): void;

    public function isBlacklisted(string $jti): bool;
}
