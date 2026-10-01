<?php

declare(strict_types=1);

namespace App\Http\Controllers\Order;

use App\Domain\Order\OrderRepositoryInterface;
use App\Domain\Order\OrderStatus;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class OrderController extends Controller
{
    public function __construct(
        private readonly OrderRepositoryInterface $orders,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->input('page', 1));
        $pageSize = max(1, min(100, (int) $request->input('pageSize', 20)));
        $status = $request->input('status')
            ? OrderStatus::tryFrom((string) $request->input('status'))
            : null;

        [$entities, $total] = $this->orders->list($page, $pageSize, $status);

        return new JsonResponse([
            'data' => array_map(fn ($o) => $o->toResponse(), $entities),
            'meta' => [
                'pagination' => [
                    'page' => $page,
                    'pageSize' => $pageSize,
                    'total' => $total,
                    'totalPages' => (int) ceil($total / $pageSize),
                ],
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $order = $this->orders->findById($id);

        if (! $order) {
            throw new NotFoundException('Order', $id);
        }

        return new JsonResponse(['data' => $order->toResponse()]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unitPrice' => 'sometimes|integer|min:0',
            'customerId' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
        ]);

        /** @var array<int, array<string, mixed>> $items */
        $items = $request->input('items');

        $totalAmount = 0;
        foreach ($items as $item) {
            if (isset($item['unitPrice'])) {
                $totalAmount += (int) $item['unitPrice'] * (int) $item['quantity'];
            }
        }

        $order = $this->orders->create(
            $items,
            $totalAmount,
            $request->input('tenantId') ? (string) $request->input('tenantId') : null,
            $request->input('customerId') ? (string) $request->input('customerId') : null,
            $request->input('notes') ? (string) $request->input('notes') : null,
        );

        return new JsonResponse(['data' => $order->toResponse()], 201);
    }

    public function export(): JsonResponse
    {
        return new JsonResponse((object) []);
    }
}
