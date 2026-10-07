<?php

declare(strict_types=1);

namespace App\Domain\Shared\Exceptions;

final class NotFoundException extends DomainException
{
    /**
     * `new NotFoundException('User', $id)` → "User not found: <id>"; `new NotFoundException('User not found')` keeps the message.
     */
    public function __construct(string $entity, ?string $id = null)
    {
        parent::__construct($id === null ? $entity : "{$entity} not found: {$id}", 'NOT_FOUND', 404);
    }
}
