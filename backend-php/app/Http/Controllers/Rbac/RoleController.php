<?php

declare(strict_types=1);

namespace App\Http\Controllers\Rbac;

use App\Domain\Rbac\RbacRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class RoleController extends Controller
{
    public function __construct(
        private readonly RbacRepositoryInterface $rbac,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $roles = $this->rbac->listRoles($tenantId);

        return new JsonResponse([
            'data' => array_map(fn ($r) => $r->toResponse(), $roles),
        ]);
    }

    public function show(Request $request, string $roleId): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $role = $this->rbac->findRoleById($tenantId, $roleId);

        if (! $role) {
            throw new NotFoundException('Role not found');
        }

        return new JsonResponse(['data' => $role->toResponse()]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'slug' => 'required|string',
            'description' => 'sometimes|string',
        ]);

        $tenantId = (string) $request->input('tenant_id');

        $role = $this->rbac->createRole(
            $tenantId,
            (string) $request->input('name'),
            (string) $request->input('slug'),
            $request->input('description') ? (string) $request->input('description') : null,
        );

        return new JsonResponse(['data' => $role->toResponse()], 201);
    }

    public function update(Request $request, string $roleId): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'description' => 'sometimes|string',
        ]);

        $role = $this->rbac->updateRole(
            $roleId,
            (string) $request->input('name'),
            $request->input('description') ? (string) $request->input('description') : null,
        );

        return new JsonResponse(['data' => $role->toResponse()]);
    }

    public function destroy(string $roleId): JsonResponse
    {
        $deleted = $this->rbac->deleteRole($roleId);

        if (! $deleted) {
            throw new NotFoundException('Role not found');
        }

        return new JsonResponse(['success' => true]);
    }

    public function permissions(Request $request, string $roleId): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $permissions = $this->rbac->getRolePermissions($tenantId, $roleId);

        return new JsonResponse(['data' => $permissions]);
    }

    public function setPermissions(Request $request, string $roleId): JsonResponse
    {
        $request->validate([
            'permissionIds' => 'required|array',
            'permissionIds.*' => 'string',
        ]);

        $tenantId = (string) $request->input('tenant_id');

        /** @var list<string> $permissionIds */
        $permissionIds = $request->input('permissionIds');
        $this->rbac->setRolePermissions($tenantId, $roleId, $permissionIds);

        return new JsonResponse(['success' => true]);
    }
}
