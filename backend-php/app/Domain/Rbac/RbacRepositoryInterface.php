<?php

declare(strict_types=1);

namespace App\Domain\Rbac;

interface RbacRepositoryInterface
{
    // --- Roles ---
    public function findRoleById(string $tenantId, string $roleId): ?RoleEntity;

    public function findRoleBySlug(string $tenantId, string $slug): ?RoleEntity;

    /**
     * @return list<RoleEntity>
     */
    public function listRoles(string $tenantId): array;

    public function createRole(string $tenantId, string $name, string $slug, ?string $description = null): RoleEntity;

    public function updateRole(string $roleId, string $name, ?string $description = null): RoleEntity;

    public function deleteRole(string $roleId): bool;

    /**
     * @param list<string> $permissionIds
     */
    public function setRolePermissions(string $tenantId, string $roleId, array $permissionIds): void;

    /**
     * @return list<string>
     */
    public function getRolePermissions(string $tenantId, string $roleId): array;

    // --- Permissions ---
    public function findPermissionById(string $permissionId): ?PermissionEntity;

    /**
     * @return list<PermissionEntity>
     */
    public function listPermissions(?string $moduleId = null): array;

    public function createPermission(string $moduleId, string $name, string $slug, ?string $description = null): PermissionEntity;

    public function deletePermission(string $permissionId): bool;

    // --- Modules ---
    public function findModuleById(string $tenantId, string $moduleId): ?ModuleEntity;

    /**
     * @return list<ModuleEntity>
     */
    public function listModules(string $tenantId): array;

    /**
     * @return list<ModuleEntity>
     */
    public function getModuleTree(string $tenantId): array;

    public function createModule(string $tenantId, string $name, string $slug, ?string $parentId = null, int $sortOrder = 0): ModuleEntity;

    public function updateModule(string $moduleId, string $name, ?string $parentId = null, int $sortOrder = 0): ModuleEntity;

    public function deleteModule(string $moduleId): bool;

    // --- Authorization check ---
    public function userHasPermission(string $tenantId, string $userId, string $permissionSlug): bool;
}
