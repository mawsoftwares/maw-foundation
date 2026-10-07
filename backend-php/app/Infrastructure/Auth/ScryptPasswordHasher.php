<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Auth\PasswordHasherInterface;

/**
 * Node-compatible password hashing: `scrypt$<saltHex>$<keyHex>` with scrypt N=16384, r=8, p=1, 64-byte key — exactly
 * what `@mawsoftwares/auth-core` writes and verifies, so both backends share one `users.password_hash` column.
 *
 * Node's format carries no parameters, so they are fixed; the constructor rejects a config that would drift.
 * New hashes use a 32-byte salt, which libsodium's scrypt accepts (fast) and Node reads back fine. Hashes with any
 * other salt length (Node historically wrote 16) fall back to pure-PHP scrypt, and `needsRehash()` flags them so
 * the caller can upgrade them after a successful login.
 */
final class ScryptPasswordHasher implements PasswordHasherInterface
{
    public const N = 16384;
    public const R = 8;
    public const P = 1;
    public const KEY_LENGTH = 64;

    private const FAST_SALT_BYTES = SODIUM_CRYPTO_PWHASH_SCRYPTSALSA208SHA256_SALTBYTES; // 32

    public function __construct(
        int $n = self::N,
        int $r = self::R,
        int $p = self::P,
        int $keyLength = self::KEY_LENGTH,
    ) {
        if ([$n, $r, $p, $keyLength] !== [self::N, self::R, self::P, self::KEY_LENGTH]) {
            throw new \LogicException(
                'Password hashes must be scrypt N=16384 r=8 p=1 keylen=64 to stay compatible with the Node backend '
                . "(got N={$n} r={$r} p={$p} keylen={$keyLength}). Remove the SCRYPT_* overrides.",
            );
        }
    }

    public function hash(string $password): string
    {
        $salt = random_bytes(self::FAST_SALT_BYTES);

        return 'scrypt$' . bin2hex($salt) . '$' . bin2hex($this->derive($password, $salt));
    }

    public function verify(string $password, string $hash): bool
    {
        $parts = explode('$', $hash);
        if (count($parts) !== 3 || $parts[0] !== 'scrypt') {
            return false;
        }
        $salt = ctype_xdigit($parts[1]) && $parts[1] !== '' && strlen($parts[1]) % 2 === 0 ? hex2bin($parts[1]) : false;
        $expected = ctype_xdigit($parts[2]) && strlen($parts[2]) === self::KEY_LENGTH * 2 ? hex2bin($parts[2]) : false;
        if ($salt === false || $expected === false) {
            return false;
        }

        return hash_equals($expected, $this->derive($password, $salt));
    }

    public function needsRehash(string $hash): bool
    {
        $parts = explode('$', $hash);

        return count($parts) === 3 && $parts[0] === 'scrypt' && strlen($parts[1]) !== self::FAST_SALT_BYTES * 2;
    }

    private function derive(string $password, string $salt): string
    {
        if (strlen($salt) === self::FAST_SALT_BYTES) {
            // ops/mem limits chosen so libsodium picks N=16384, r=8, p=1 (checked byte-for-byte against Node).
            return sodium_crypto_pwhash_scryptsalsa208sha256(self::KEY_LENGTH, $password, $salt, self::N * 32, 32 * 1024 * 1024);
        }

        return ScryptFallback::derive($password, $salt, self::N, self::R, self::P, self::KEY_LENGTH);
    }
}
