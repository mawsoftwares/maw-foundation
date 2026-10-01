<?php

declare(strict_types=1);

namespace App\Domain\Shared\ValueObjects;

use InvalidArgumentException;

final readonly class TenantId
{
    private function __construct(
        public string $value,
    ) {
        if ($value === '') {
            throw new InvalidArgumentException('TenantId cannot be empty');
        }
    }

    public static function from(string $value): self
    {
        return new self($value);
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
