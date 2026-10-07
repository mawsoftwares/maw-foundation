<?php

declare(strict_types=1);

namespace App\Access;

/** The authenticated caller. `role` is read fresh from the users table, not trusted from the JWT. */
final readonly class Actor
{
    public function __construct(
        public string $userId,
        public string $tenantId,
        public string $role,
    ) {}
}
