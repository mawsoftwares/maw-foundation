<?php

declare(strict_types=1);

namespace App\Domain\Order;

final readonly class OrderEntity
{
    /**
     * @param array<int, array<string, mixed>>|null $items
     */
    public function __construct(
        public string $id,
        public ?string $tenantId,
        public OrderStatus $status,
        public ?array $items,
        public int $totalAmount,
        public ?string $customerId,
        public ?string $notes,
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
            'tenantId' => $this->tenantId,
            'status' => $this->status->value,
            'items' => $this->items,
            'totalAmount' => $this->totalAmount,
            'customerId' => $this->customerId,
            'notes' => $this->notes,
            'createdAt' => $this->createdAt?->format('c'),
            'updatedAt' => $this->updatedAt?->format('c'),
        ];
    }
}
