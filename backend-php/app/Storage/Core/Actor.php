<?php

declare(strict_types=1);

namespace App\Storage\Core;

/** Tenant and user come ONLY from the authenticated identity — never from request input. */
final readonly class Actor
{
    public function __construct(public string $tenantId, public ?string $userId) {}
}
