<?php

declare(strict_types=1);

namespace App\Domain\Rbac;

final readonly class PermissionEntity
{
    public function __construct(
        public string $id,
        public string $moduleId,
        public string $name,
        public string $slug,
        public ?string $description,
        public ?\DateTimeImmutable $createdAt = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'moduleId' => $this->moduleId,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'createdAt' => $this->createdAt?->format('c'),
        ];
    }
}
