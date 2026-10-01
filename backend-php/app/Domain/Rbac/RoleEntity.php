<?php

declare(strict_types=1);

namespace App\Domain\Rbac;

final readonly class RoleEntity
{
    /**
     * @param list<string> $permissions
     */
    public function __construct(
        public string $id,
        public string $tenantId,
        public string $name,
        public string $slug,
        public ?string $description,
        public bool $isSystem,
        public array $permissions = [],
        public ?\DateTimeImmutable $createdAt = null,
        public ?\DateTimeImmutable $updatedAt = null,
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
            'description' => $this->description,
            'isSystem' => $this->isSystem,
            'permissions' => $this->permissions,
            'createdAt' => $this->createdAt?->format('c'),
            'updatedAt' => $this->updatedAt?->format('c'),
        ];
    }
}
