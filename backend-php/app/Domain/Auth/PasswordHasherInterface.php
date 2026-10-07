<?php

declare(strict_types=1);

namespace App\Domain\Auth;

interface PasswordHasherInterface
{
    public function hash(string $password): string;

    public function verify(string $password, string $hash): bool;

    /** True when `$hash` verifies but is in a slow / outdated form and should be re-hashed after a successful login. */
    public function needsRehash(string $hash): bool;
}
