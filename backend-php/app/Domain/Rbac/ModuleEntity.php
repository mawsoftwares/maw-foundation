<?php

declare(strict_types=1);

namespace App\Domain\Rbac;

final readonly class ModuleEntity
{
    /**
     * @param list<self> $children
     */
    public function __construct(
        public string $id,
        public string $tenantId,
        public string $name,
        public string $slug,
        public ?string $parentId,
        public int $sortOrder,
        public bool $isActive,
        public array $children = [],
        public ?\DateTimeImmutable $createdAt = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'parentId' => $this->parentId,
            'sortOrder' => $this->sortOrder,
            'isActive' => $this->isActive,
            'children' => array_map(
                static fn (self $child) => $child->toResponse(),
                $this->children,
            ),
            'createdAt' => $this->createdAt?->format('c'),
        ];
    }
}
