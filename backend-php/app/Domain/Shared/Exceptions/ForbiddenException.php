<?php

declare(strict_types=1);

namespace App\Domain\Shared\Exceptions;

final class ForbiddenException extends DomainException
{
    public function __construct(
        string $message = 'Forbidden',
        string $code = 'FORBIDDEN',
    ) {
        parent::__construct($message, $code, 403);
    }
}
