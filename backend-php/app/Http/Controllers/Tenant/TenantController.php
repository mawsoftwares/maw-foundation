<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Tenant\TenantRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class TenantController extends Controller
{
    public function __construct(
        private readonly TenantRepositoryInterface $tenants,
    ) {}

    public function index(): JsonResponse
    {
        $tenants = $this->tenants->list();

        return new JsonResponse([
            'data' => array_map(fn ($t) => $t->toResponse(), $tenants),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $tenant = $this->tenants->findById($id);

        if (! $tenant) {
            throw new NotFoundException('Tenant', $id);
        }

        return new JsonResponse(['data' => $tenant->toResponse()]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'slug' => 'required|string',
            'domain' => 'sometimes|nullable|string',
            'settings' => 'sometimes|nullable|array',
        ]);

        $tenant = $this->tenants->create(
            (string) $request->input('name'),
            (string) $request->input('slug'),
            $request->input('domain') ? (string) $request->input('domain') : null,
            $request->input('settings'),
        );

        return new JsonResponse(['data' => $tenant->toResponse()], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|string',
            'domain' => 'sometimes|nullable|string',
            'isActive' => 'sometimes|boolean',
            'settings' => 'sometimes|nullable|array',
        ]);

        /** @var array<string, mixed> $data */
        $data = $request->only(['name', 'domain', 'isActive', 'settings']);

        $tenant = $this->tenants->update($id, $data);

        return new JsonResponse(['data' => $tenant->toResponse()]);
    }
}
