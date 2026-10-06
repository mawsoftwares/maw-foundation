<?php

declare(strict_types=1);

namespace App\Storage\Core;

final readonly class StorageFolder
{
    public function __construct(
        public string $id,
        public string $tenantId,
        public string $storageConfigId,
        public ?string $parentId,
        public string $name,
        public string $path,
        public ?string $createdBy,
        public string $createdAt,
        public string $updatedAt,
        public ?string $deletedAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toView(): array
    {
        return [
            'id' => $this->id,
            'parentId' => $this->parentId,
            'name' => $this->name,
            'path' => $this->path,
            'storageConfigId' => $this->storageConfigId,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
