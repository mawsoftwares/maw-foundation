<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Order\OrderEntity;
use App\Domain\Order\OrderRepositoryInterface;
use App\Domain\Order\OrderStatus;
use App\Infrastructure\Persistence\Eloquent\Models\OrderModel;
use Illuminate\Support\Str;

final class EloquentOrderRepository implements OrderRepositoryInterface
{
    /**
     * @return array{list<OrderEntity>, int}
     */
    public function list(int $page, int $pageSize, ?OrderStatus $status = null): array
    {
        $query = OrderModel::query();

        if ($status !== null) {
            $query->where('status', $status->value);
        }

        $total = $query->count();

        $models = $query->orderBy('created_at', 'desc')
            ->offset(($page - 1) * $pageSize)
            ->limit($pageSize)
            ->get();

        $entities = $models
            ->map(fn (OrderModel $m) => $this->toEntity($m))
            ->values()
            ->all();

        return [$entities, $total];
    }

    public function findById(string $id): ?OrderEntity
    {
        $model = OrderModel::find($id);

        return $model ? $this->toEntity($model) : null;
    }

    /**
     * @param array<int, array<string, mixed>> $items
     */
    public function create(array $items, int $totalAmount, ?string $tenantId, ?string $customerId, ?string $notes): OrderEntity
    {
        $model = OrderModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'status' => OrderStatus::PENDING->value,
            'items' => $items,
            'total_amount' => $totalAmount,
            'customer_id' => $customerId,
            'notes' => $notes,
        ]);

        return $this->toEntity($model);
    }

    public function count(?OrderStatus $status = null): int
    {
        $query = OrderModel::query();

        if ($status !== null) {
            $query->where('status', $status->value);
        }

        return $query->count();
    }

    private function toEntity(OrderModel $model): OrderEntity
    {
        return new OrderEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            status: OrderStatus::from($model->status),
            items: $model->items,
            totalAmount: (int) $model->total_amount,
            customerId: $model->customer_id,
            notes: $model->notes,
            createdAt: $model->created_at ? new \DateTimeImmutable($model->created_at->toIso8601String()) : null,
            updatedAt: $model->updated_at ? new \DateTimeImmutable($model->updated_at->toIso8601String()) : null,
        );
    }
}
