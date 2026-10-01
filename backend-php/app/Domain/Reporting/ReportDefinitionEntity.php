<?php

declare(strict_types=1);

namespace App\Domain\Reporting;

final readonly class ReportDefinitionEntity
{
    /**
     * @param array<string, mixed>|null $metadata
     */
    public function __construct(
        public string $name,
        public string $label,
        public ?string $description,
        public ?string $category,
        public ?array $metadata,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toSummary(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'category' => $this->category,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toMetadata(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'description' => $this->description,
            'category' => $this->category,
            'metadata' => $this->metadata,
        ];
    }
}
