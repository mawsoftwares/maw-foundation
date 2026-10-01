<?php

declare(strict_types=1);

namespace App\Domain\Auth;

interface TokenServiceInterface
{
    /**
     * @param array<string, mixed> $claims
     */
    public function sign(array $claims): string;

    /**
     * @return array<string, mixed>
     * @throws \App\Domain\Shared\Exceptions\UnauthorizedException
     */
    public function verify(string $token): array;
}
