<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rbac;

use App\Domain\Rbac\RbacRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class ModuleController extends Controller
{
    public function __construct(
        private readonly RbacRepositoryInterface $rbac,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $modules = $this->rbac->listModules($tenantId);

        return new JsonResponse([
            'data' => array_map(fn ($m) => $m->toResponse(), $modules),
        ]);
    }

    public function tree(Request $request): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $tree = $this->rbac->getModuleTree($tenantId);

        return new JsonResponse([
            'data' => array_map(fn ($m) => $m->toResponse(), $tree),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'slug' => 'required|string',
            'parentId' => 'sometimes|string|nullable',
            'sortOrder' => 'sometimes|integer',
        ]);

        $tenantId = (string) $request->input('tenant_id');

        $module = $this->rbac->createModule(
            $tenantId,
            (string) $request->input('name'),
            (string) $request->input('slug'),
            $request->input('parentId') ? (string) $request->input('parentId') : null,
            (int) $request->input('sortOrder', 0),
        );

        return new JsonResponse(['data' => $module->toResponse()], 201);
    }

    public function update(Request $request, string $moduleId): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'parentId' => 'sometimes|string|nullable',
            'sortOrder' => 'sometimes|integer',
        ]);

        $module = $this->rbac->updateModule(
            $moduleId,
            (string) $request->input('name'),
            $request->input('parentId') ? (string) $request->input('parentId') : null,
            (int) $request->input('sortOrder', 0),
        );

        return new JsonResponse(['data' => $module->toResponse()]);
    }

    public function destroy(string $moduleId): JsonResponse
    {
        $deleted = $this->rbac->deleteModule($moduleId);

        if (! $deleted) {
            throw new NotFoundException('Module not found');
        }

        return new JsonResponse(['success' => true]);
    }
}
