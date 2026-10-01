<?php

declare(strict_types=1);

namespace App\Domain\Auth;

final readonly class AuthTokens
{
    public function __construct(
        public string $accessToken,
        public string $refreshToken,
        public int $accessTokenExpiresIn,
        public int $refreshTokenExpiresIn,
    ) {}

    /**
     * @return array<string, string|int>
     */
    public function toResponse(): array
    {
        return [
            'accessToken' => $this->accessToken,
            'refreshToken' => $this->refreshToken,
            'expiresIn' => $this->accessTokenExpiresIn,
        ];
    }
}
