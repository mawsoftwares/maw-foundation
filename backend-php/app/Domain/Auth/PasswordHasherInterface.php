<?php

declare(strict_types=1);

namespace App\Domain\Auth;

interface PasswordHasherInterface
{
    public function hash(string $password): string;

    public function verify(string $password, string $hash): bool;
}
