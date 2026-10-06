<?php

declare(strict_types=1);

namespace App\Storage\Core;

final readonly class StorageAttachment
{
    public function __construct(
        public string $id,
        public string $tenantId,
        public string $fileId,
        public string $entityType,
        public string $entityId,
        public string $category,
        public ?string $createdBy,
        public string $createdAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toView(): array
    {
        return [
            'id' => $this->id,
            'tenantId' => $this->tenantId,
            'fileId' => $this->fileId,
            'entityType' => $this->entityType,
            'entityId' => $this->entityId,
            'category' => $this->category,
            'createdBy' => $this->createdBy,
            'createdAt' => $this->createdAt,
        ];
    }
}
