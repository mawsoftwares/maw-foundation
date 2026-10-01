<?php

declare(strict_types=1);

namespace App\Domain\Shared\Contracts;

enum AccountStatus: string
{
    case ACTIVE = 'ACTIVE';
    case DISABLED = 'DISABLED';
    case LOCKED = 'LOCKED';
    case PENDING_VERIFICATION = 'PENDING_VERIFICATION';
    case SUSPENDED = 'SUSPENDED';
}
