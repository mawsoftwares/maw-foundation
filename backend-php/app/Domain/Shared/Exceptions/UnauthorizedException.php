<?php

declare(strict_types=1);

namespace App\Domain\Shared\Exceptions;

final class UnauthorizedException extends DomainException
{
    public function __construct(
        string $message = 'Unauthorized',
        string $code = 'UNAUTHORIZED',
    ) {
        parent::__construct($message, $code, 401);
    }
}
