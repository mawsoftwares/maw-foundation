<?php

declare(strict_types=1);

namespace App\Access;

use App\Domain\Shared\Exceptions\ForbiddenException;
use App\Domain\Shared\Exceptions\NotFoundException;

/** Every "may this caller see / touch / grant that?" decision for users and roles lives here. */
final class AccessPolicy
{
    public function __construct(private readonly AccessRepository $repo) {}

    /**
     * Codes of ACTIVE roles strictly below the actor's — what they may see and assign.
     *
     * @return list<string>
     */
    public function assignableRoleCodes(Actor $actor): array
    {
        $roles = $this->repo->roles();
        $codes = [];
        foreach (RoleHierarchy::visibleRoles($roles, $actor->role) as $role) {
            if ($role['is_active']) {
                $codes[] = $role['code'];
            }
        }

        return $codes;
    }

    /** A user is reachable if it is the caller themselves or holds a role strictly below the caller's. Hidden users answer 404. */
    public function assertCanReachUser(Actor $actor, object $target): void
    {
        if ((string) $target->id === $actor->userId) {
            return;
        }
        if (! RoleHierarchy::canManage($this->repo->roles(), $actor->role, (string) $target->role)) {
            throw new NotFoundException('User', (string) $target->id);
        }
    }

    /** The role being assigned must exist, be active, and sit strictly below the caller's. */
    public function assertCanAssignRole(Actor $actor, string $roleCode): void
    {
        if (! in_array($roleCode, $this->assignableRoleCodes($actor), true)) {
            throw new ForbiddenException('You cannot assign a role at or above your own level.');
        }
    }

    /** @param array{id: int, code: string, name: string, description: ?string, is_active: bool, sort_order: int, level: int} $role */
    public function assertCanReachRole(Actor $actor, array $role): void
    {
        if (! RoleHierarchy::canManage($this->repo->roles(), $actor->role, $role['code'])) {
            throw new NotFoundException('Role', (string) $role['id']);
        }
    }

    public function assertCanSetRoleLevel(Actor $actor, int $level): void
    {
        $actorLevel = RoleHierarchy::levelOf($this->repo->roles(), $actor->role);
        if (! RoleHierarchy::outranks($actorLevel, $level)) {
            throw new ForbiddenException('A role must stay strictly below your own level.');
        }
    }

    /**
     * Grant ceiling: the caller may only add or remove permissions they hold themselves.
     *
     * @param list<int> $newPermissionIds
     */
    public function assertGrantCeiling(Actor $actor, int $roleId, array $newPermissionIds): void
    {
        $old = $this->repo->rolePermissionIds($roleId);
        $changed = array_merge(array_diff($newPermissionIds, $old), array_diff($old, $newPermissionIds));

        $actorRoleId = null;
        foreach ($this->repo->roles() as $role) {
            if ($role['code'] === $actor->role) {
                $actorRoleId = $role['id'];
            }
        }
        $held = $actorRoleId !== null ? $this->repo->rolePermissionIds($actorRoleId) : [];

        if (array_diff($changed, $held) !== []) {
            throw new ForbiddenException('You can only grant or revoke permissions that you hold yourself.');
        }
    }
}
