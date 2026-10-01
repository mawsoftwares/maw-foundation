<?php

declare(strict_types=1);

namespace App\Domain\Shared\Exceptions;

final class ConflictException extends DomainException
{
    public function __construct(
        string $message,
        string $code = 'CONFLICT',
    ) {
        parent::__construct($message, $code, 409);
    }
}
