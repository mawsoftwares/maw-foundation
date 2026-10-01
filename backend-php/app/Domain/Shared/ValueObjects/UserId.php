<?php

declare(strict_types=1);

namespace App\Domain\Shared\ValueObjects;

use InvalidArgumentException;

final readonly class UserId
{
    private function __construct(
        public string $value,
    ) {
        if ($value === '') {
            throw new InvalidArgumentException('UserId cannot be empty');
        }
    }

    public static function from(string $value): self
    {
        return new self($value);
    }

    public static function generate(): self
    {
        return new self('u-' . bin2hex(random_bytes(8)));
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
