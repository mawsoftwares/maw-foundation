<?php

declare(strict_types=1);

namespace App\Domain\Shared\Exceptions;

final class ValidationException extends DomainException
{
    /**
     * @param array<string, string[]> $violations
     */
    public function __construct(
        string $message = 'Validation failed',
        public readonly array $violations = [],
    ) {
        parent::__construct($message, 'VALIDATION_FAILED', 400);
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiError(): array
    {
        return [
            'error' => $this->getMessage(),
            'code' => $this->errorCode,
            'violations' => $this->violations,
        ];
    }
}
