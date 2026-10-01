<?php

declare(strict_types=1);

namespace App\Domain\File;

final readonly class FileEntity
{
    public function __construct(
        public string $key,
        public ?string $originalName,
        public string $mimeType,
        public int $size,
        public ?string $category,
        public ?string $description,
        public ?string $uploadedBy,
        public ?string $createdAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toResponse(): array
    {
        return [
            'key' => $this->key,
            'originalName' => $this->originalName,
            'mimeType' => $this->mimeType,
            'size' => $this->size,
            'category' => $this->category,
            'description' => $this->description,
            'uploadedBy' => $this->uploadedBy,
            'createdAt' => $this->createdAt,
        ];
    }
}
