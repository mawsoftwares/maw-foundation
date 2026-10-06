<?php

declare(strict_types=1);

namespace App\Storage\Core;

final readonly class StorageFile
{
    public const PENDING = 'pending';
    public const UPLOADING = 'uploading';
    public const UPLOADED = 'uploaded';
    public const FAILED = 'failed';
    public const DELETED = 'deleted';

    public function __construct(
        public string $id,
        public string $tenantId,
        public string $storageConfigId,
        public ?string $folderId,
        public string $originalName,
        public string $objectKey,
        public string $mimeType,
        public string $extension,
        public int $fileSize,
        public ?string $checksum,
        public string $status,
        public string $visibility,
        public ?string $uploadedBy,
        public string $createdAt,
        public string $updatedAt,
        public ?string $deletedAt,
    ) {}

    /**
     * Metadata only — the object key and provider details are never exposed.
     *
     * @return array<string, mixed>
     */
    public function toView(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->originalName,
            'mimeType' => $this->mimeType,
            'size' => $this->fileSize,
            'folderId' => $this->folderId,
            'status' => $this->status,
            'createdAt' => $this->createdAt,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
