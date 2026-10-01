<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Auth\PasswordHasherInterface;

final class ScryptPasswordHasher implements PasswordHasherInterface
{
    public function __construct(
        private readonly int $n = 16384,
        private readonly int $r = 8,
        private readonly int $p = 1,
        private readonly int $keyLength = 64,
    ) {}

    public function hash(string $password): string
    {
        $salt = random_bytes(32);
        $derived = sodium_crypto_pwhash_scryptsalsa208sha256(
            $this->keyLength,
            $password,
            $salt,
            $this->opsLimit(),
            $this->memLimit(),
        );

        return base64_encode($salt) . '$' . base64_encode($derived);
    }

    public function verify(string $password, string $hash): bool
    {
        $parts = explode('$', $hash);
        if (count($parts) !== 2) {
            return false;
        }

        $salt = base64_decode($parts[0], true);
        $storedDerived = base64_decode($parts[1], true);

        if ($salt === false || $storedDerived === false) {
            return false;
        }

        $derived = sodium_crypto_pwhash_scryptsalsa208sha256(
            $this->keyLength,
            $password,
            $salt,
            $this->opsLimit(),
            $this->memLimit(),
        );

        return hash_equals($storedDerived, $derived);
    }

    private function opsLimit(): int
    {
        return $this->n;
    }

    private function memLimit(): int
    {
        return 128 * $this->r * ($this->n + $this->p);
    }
}
