<?php

declare(strict_types=1);

namespace App\Domain\User;

use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;

final readonly class CreateUserData
{
    public function __construct(
        public TenantId $tenantId,
        public Email $email,
        public string $passwordHash,
        public string $role,
        public ?string $name = null,
        public string $audience = 'admin',
        public ?string $scopeId = null,
        public string $accountStatus = 'ACTIVE',
    ) {}
}
