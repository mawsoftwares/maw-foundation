<?php

declare(strict_types=1);

namespace App\Domain\Menu;

final readonly class MenuEntity
{
    /**
     * @param list<self> $children
     */
    public function __construct(
        public string $id,
        public string $label,
        public ?string $icon,
        public ?string $path,
        public ?string $parentId,
        public ?string $moduleCode,
        public ?string $permissionCode,
        public int $sortOrder,
        public bool $isActive = true,
        public array $children = [],
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'icon' => $this->icon,
            'path' => $this->path,
            'parentId' => $this->parentId,
            'moduleCode' => $this->moduleCode,
            'permissionCode' => $this->permissionCode,
            'sortOrder' => $this->sortOrder,
            'isActive' => $this->isActive,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toTreeResponse(): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'icon' => $this->icon,
            'path' => $this->path,
            'parentId' => $this->parentId,
            'moduleCode' => $this->moduleCode,
            'permissionCode' => $this->permissionCode,
            'sortOrder' => $this->sortOrder,
            'isActive' => $this->isActive,
            'children' => array_map(
                static fn (self $child) => $child->toTreeResponse(),
                $this->children,
            ),
        ];
    }
}
