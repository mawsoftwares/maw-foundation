<?php

declare(strict_types=1);

namespace App\Domain\Shared\Exceptions;

final class NotFoundException extends DomainException
{
    public function __construct(string $entity, string $id)
    {
        parent::__construct("{$entity} not found: {$id}", 'NOT_FOUND', 404);
    }
}
