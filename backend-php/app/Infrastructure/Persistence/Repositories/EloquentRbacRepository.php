<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence\Repositories;

use App\Domain\Rbac\ModuleEntity;
use App\Domain\Rbac\PermissionEntity;
use App\Domain\Rbac\RbacRepositoryInterface;
use App\Domain\Rbac\RoleEntity;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Infrastructure\Persistence\Eloquent\Models\ModuleModel;
use App\Infrastructure\Persistence\Eloquent\Models\PermissionModel;
use App\Infrastructure\Persistence\Eloquent\Models\RoleModel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class EloquentRbacRepository implements RbacRepositoryInterface
{
    // --- Roles ---

    public function findRoleById(string $tenantId, string $roleId): ?RoleEntity
    {
        $model = RoleModel::where('tenant_id', $tenantId)->where('id', $roleId)->first();

        return $model ? $this->toRoleEntity($model, $tenantId) : null;
    }

    public function findRoleBySlug(string $tenantId, string $slug): ?RoleEntity
    {
        $model = RoleModel::where('tenant_id', $tenantId)->where('slug', $slug)->first();

        return $model ? $this->toRoleEntity($model, $tenantId) : null;
    }

    /**
     * @return list<RoleEntity>
     */
    public function listRoles(string $tenantId): array
    {
        return RoleModel::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get()
            ->map(fn (RoleModel $m) => $this->toRoleEntity($m, $tenantId))
            ->values()
            ->all();
    }

    public function createRole(string $tenantId, string $name, string $slug, ?string $description = null): RoleEntity
    {
        $model = RoleModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'name' => $name,
            'slug' => $slug,
            'description' => $description,
            'is_system' => false,
        ]);

        return $this->toRoleEntity($model, $tenantId);
    }

    public function updateRole(string $roleId, string $name, ?string $description = null): RoleEntity
    {
        $model = RoleModel::find($roleId);
        if (! $model) {
            throw new NotFoundException('Role not found');
        }

        $model->update(array_filter([
            'name' => $name,
            'description' => $description,
        ], fn ($v) => $v !== null));

        return $this->toRoleEntity($model->fresh() ?? $model, $model->tenant_id);
    }

    public function deleteRole(string $roleId): bool
    {
        return (bool) RoleModel::where('id', $roleId)->where('is_system', false)->delete();
    }

    /**
     * @param list<string> $permissionIds
     */
    public function setRolePermissions(string $tenantId, string $roleId, array $permissionIds): void
    {
        DB::table('tenant_role_permissions')
            ->where('tenant_id', $tenantId)
            ->where('role_id', $roleId)
            ->delete();

        $rows = array_map(fn (string $pid) => [
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'role_id' => $roleId,
            'permission_id' => $pid,
            'created_at' => now(),
        ], $permissionIds);

        if ($rows !== []) {
            DB::table('tenant_role_permissions')->insert($rows);
        }
    }

    /**
     * @return list<string>
     */
    public function getRolePermissions(string $tenantId, string $roleId): array
    {
        return DB::table('tenant_role_permissions')
            ->where('tenant_id', $tenantId)
            ->where('role_id', $roleId)
            ->pluck('permission_id')
            ->all();
    }

    // --- Permissions ---

    public function findPermissionById(string $permissionId): ?PermissionEntity
    {
        $model = PermissionModel::find($permissionId);

        return $model ? $this->toPermissionEntity($model) : null;
    }

    /**
     * @return list<PermissionEntity>
     */
    public function listPermissions(?string $moduleId = null): array
    {
        $query = PermissionModel::query();
        if ($moduleId !== null) {
            $query->where('module_id', $moduleId);
        }

        return $query->orderBy('name')
            ->get()
            ->map(fn (PermissionModel $m) => $this->toPermissionEntity($m))
            ->values()
            ->all();
    }

    public function createPermission(string $moduleId, string $name, string $slug, ?string $description = null): PermissionEntity
    {
        $model = PermissionModel::create([
            'id' => Str::uuid()->toString(),
            'module_id' => $moduleId,
            'name' => $name,
            'slug' => $slug,
            'description' => $description,
        ]);

        return $this->toPermissionEntity($model);
    }

    public function deletePermission(string $permissionId): bool
    {
        return (bool) PermissionModel::where('id', $permissionId)->delete();
    }

    // --- Modules ---

    public function findModuleById(string $tenantId, string $moduleId): ?ModuleEntity
    {
        $model = ModuleModel::where('tenant_id', $tenantId)->where('id', $moduleId)->first();

        return $model ? $this->toModuleEntity($model) : null;
    }

    /**
     * @return list<ModuleEntity>
     */
    public function listModules(string $tenantId): array
    {
        return ModuleModel::where('tenant_id', $tenantId)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (ModuleModel $m) => $this->toModuleEntity($m))
            ->values()
            ->all();
    }

    /**
     * @return list<ModuleEntity>
     */
    public function getModuleTree(string $tenantId): array
    {
        $all = ModuleModel::where('tenant_id', $tenantId)
            ->orderBy('sort_order')
            ->get();

        $roots = $all->filter(fn (ModuleModel $m) => $m->parent_id === null);

        return $roots->map(function (ModuleModel $root) use ($all) {
            return $this->buildModuleTree($root, $all);
        })->values()->all();
    }

    public function createModule(string $tenantId, string $name, string $slug, ?string $parentId = null, int $sortOrder = 0): ModuleEntity
    {
        $model = ModuleModel::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'name' => $name,
            'slug' => $slug,
            'parent_id' => $parentId,
            'sort_order' => $sortOrder,
            'is_active' => true,
        ]);

        return $this->toModuleEntity($model);
    }

    public function updateModule(string $moduleId, string $name, ?string $parentId = null, int $sortOrder = 0): ModuleEntity
    {
        $model = ModuleModel::find($moduleId);
        if (! $model) {
            throw new NotFoundException('Module not found');
        }

        $model->update([
            'name' => $name,
            'parent_id' => $parentId,
            'sort_order' => $sortOrder,
        ]);

        return $this->toModuleEntity($model->fresh() ?? $model);
    }

    public function deleteModule(string $moduleId): bool
    {
        return (bool) ModuleModel::where('id', $moduleId)->delete();
    }

    // --- Authorization ---

    public function userHasPermission(string $tenantId, string $userId, string $permissionSlug): bool
    {
        return DB::table('users')
            ->join('tenant_role_permissions', function ($join) use ($tenantId): void {
                $join->on('users.role', '=', 'tenant_role_permissions.role_id')
                    ->where('tenant_role_permissions.tenant_id', '=', $tenantId);
            })
            ->join('permissions', 'tenant_role_permissions.permission_id', '=', 'permissions.id')
            ->where('users.id', $userId)
            ->where('users.tenant_id', $tenantId)
            ->where('permissions.slug', $permissionSlug)
            ->exists();
    }

    // --- Mappers ---

    private function toRoleEntity(RoleModel $model, string $tenantId): RoleEntity
    {
        $permissions = $this->getRolePermissions($tenantId, $model->id);

        return new RoleEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            name: $model->name,
            slug: $model->slug,
            description: $model->description,
            isSystem: (bool) $model->is_system,
            permissions: $permissions,
            createdAt: $model->created_at ? new \DateTimeImmutable($model->created_at->toIso8601String()) : null,
            updatedAt: $model->updated_at ? new \DateTimeImmutable($model->updated_at->toIso8601String()) : null,
        );
    }

    private function toPermissionEntity(PermissionModel $model): PermissionEntity
    {
        return new PermissionEntity(
            id: $model->id,
            moduleId: $model->module_id,
            name: $model->name,
            slug: $model->slug,
            description: $model->description,
            createdAt: $model->created_at ? new \DateTimeImmutable($model->created_at->toIso8601String()) : null,
        );
    }

    private function toModuleEntity(ModuleModel $model): ModuleEntity
    {
        return new ModuleEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            name: $model->name,
            slug: $model->slug,
            parentId: $model->parent_id,
            sortOrder: (int) $model->sort_order,
            isActive: (bool) $model->is_active,
            children: [],
            createdAt: $model->created_at ? new \DateTimeImmutable($model->created_at->toIso8601String()) : null,
        );
    }

    /**
     * @param \Illuminate\Database\Eloquent\Collection<int, ModuleModel> $all
     */
    private function buildModuleTree(ModuleModel $parent, $all): ModuleEntity
    {
        $children = $all->filter(fn (ModuleModel $m) => $m->parent_id === $parent->id);

        $childEntities = $children->map(function (ModuleModel $child) use ($all) {
            return $this->buildModuleTree($child, $all);
        })->values()->all();

        return new ModuleEntity(
            id: $parent->id,
            tenantId: $parent->tenant_id,
            name: $parent->name,
            slug: $parent->slug,
            parentId: $parent->parent_id,
            sortOrder: (int) $parent->sort_order,
            isActive: (bool) $parent->is_active,
            children: $childEntities,
            createdAt: $parent->created_at ? new \DateTimeImmutable($parent->created_at->toIso8601String()) : null,
        );
    }
}
