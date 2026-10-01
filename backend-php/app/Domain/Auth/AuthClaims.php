<?php

declare(strict_types=1);

namespace App\Domain\Auth;

final readonly class AuthClaims
{
    public function __construct(
        public string $userId,
        public string $tenantId,
        public string $role,
        public string $audience,
        public ?string $jti = null,
    ) {}

    /**
     * @return array<string, string>
     */
    public function toArray(): array
    {
        $data = [
            'userId' => $this->userId,
            'tenantId' => $this->tenantId,
            'role' => $this->role,
            'audience' => $this->audience,
        ];

        if ($this->jti !== null) {
            $data['jti'] = $this->jti;
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            userId: (string) ($data['userId'] ?? ''),
            tenantId: (string) ($data['tenantId'] ?? ''),
            role: (string) ($data['role'] ?? ''),
            audience: (string) ($data['audience'] ?? ''),
            jti: isset($data['jti']) ? (string) $data['jti'] : null,
        );
    }
}
