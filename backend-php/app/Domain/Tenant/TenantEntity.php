<?php

declare(strict_types=1);

namespace App\Domain\Tenant;

final readonly class TenantEntity
{
    /**
     * @param array<string, mixed>|null $settings
     */
    public function __construct(
        public string $id,
        public string $name,
        public string $slug,
        public ?string $domain,
        public bool $isActive,
        public ?array $settings,
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
            'domain' => $this->domain,
            'isActive' => $this->isActive,
            'settings' => $this->settings,
            'createdAt' => $this->createdAt?->format('c'),
            'updatedAt' => $this->updatedAt?->format('c'),
        ];
    }
}
