<?php

declare(strict_types=1);

namespace App\Domain\Reporting;

use DateTimeImmutable;

final readonly class SavedReportEntity
{
    /**
     * @param array<string, mixed> $config
     */
    public function __construct(
        public string $id,
        public string $name,
        public string $definitionName,
        public array $config,
        public DateTimeImmutable $createdAt,
        public ?DateTimeImmutable $updatedAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toSummary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'definitionName' => $this->definitionName,
            'createdAt' => $this->createdAt->format(DateTimeImmutable::ATOM),
            'updatedAt' => $this->updatedAt?->format(DateTimeImmutable::ATOM),
        ];
    }
}
