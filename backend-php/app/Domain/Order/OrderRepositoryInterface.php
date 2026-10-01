<?php

declare(strict_types=1);

namespace App\Domain\Order;

interface OrderRepositoryInterface
{
    /**
     * @return array{list<OrderEntity>, int}
     */
    public function list(int $page, int $pageSize, ?OrderStatus $status = null): array;

    public function findById(string $id): ?OrderEntity;

    /**
     * @param array<int, array<string, mixed>> $items
     */
    public function create(array $items, int $totalAmount, ?string $tenantId, ?string $customerId, ?string $notes): OrderEntity;

    public function count(?OrderStatus $status = null): int;
}
