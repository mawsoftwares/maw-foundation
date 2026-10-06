<?php

declare(strict_types=1);

namespace App\Storage\Http\Controllers;

use App\Storage\Core\Actor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Standard envelope helpers (`{success, data, meta?}`) and identity access for the storage controllers. */
trait Responds
{
    private function actor(Request $request): Actor
    {
        $actor = $request->attributes->get('storage.actor');
        if (! $actor instanceof Actor) {
            throw new \App\Domain\Shared\Exceptions\UnauthorizedException('TENANT_REQUIRED', 'Tenant context is required');
        }

        return $actor;
    }

    private function ok(mixed $data, int $status = 200): JsonResponse
    {
        return new JsonResponse(['success' => true, 'data' => $data], $status);
    }

    /**
     * @param list<array<string, mixed>> $items
     */
    private function page(array $items, int $total, int $page, int $pageSize): JsonResponse
    {
        return new JsonResponse([
            'success' => true,
            'data' => $items,
            'meta' => ['pagination' => ['page' => $page, 'pageSize' => $pageSize, 'total' => $total, 'totalPages' => (int) ceil($total / $pageSize)]],
        ]);
    }

    private function noContent(): Response
    {
        return new Response('', 204);
    }

    /**
     * @return array<string, mixed>
     */
    private function body(Request $request): array
    {
        return $request->json()->all();
    }
}
