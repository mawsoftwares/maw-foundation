<?php

declare(strict_types=1);

namespace App\Domain\Auth;

use App\Domain\Shared\Exceptions\ValidationException;

final class PrehashResolver
{
    private const PREHASH_PREFIX = 'sha256:';
    private const HEX_PATTERN = '/^[0-9a-f]{64}$/';

    public static function resolve(
        string $password,
        ?string $prehashHeader,
        bool $requirePrehash,
    ): string {
        $clientClaimsPrehashed = $prehashHeader === 'sha256';

        if ($clientClaimsPrehashed) {
            if (! self::isPrehashedPassword($password)) {
                throw new ValidationException(
                    'Header claims prehash but value is not in sha256:<hex> format',
                );
            }

            return self::extractPrehash($password);
        }

        if ($requirePrehash) {
            throw new ValidationException(
                'Server requires password prehashing. Send sha256:<hex> with x-password-prehashed: sha256 header.',
            );
        }

        return $password;
    }

    public static function isPrehashedPassword(string $value): bool
    {
        if (! str_starts_with($value, self::PREHASH_PREFIX)) {
            return false;
        }

        $hex = substr($value, strlen(self::PREHASH_PREFIX));

        return (bool) preg_match(self::HEX_PATTERN, $hex);
    }

    public static function extractPrehash(string $value): string
    {
        if (! self::isPrehashedPassword($value)) {
            throw new \InvalidArgumentException('Value is not a valid prehashed password');
        }

        return substr($value, strlen(self::PREHASH_PREFIX));
    }
}
