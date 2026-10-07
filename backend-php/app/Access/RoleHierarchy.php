<?php

declare(strict_types=1);

namespace App\Access;

/**
 * Strict role ladder — PHP twin of `@mawsoftwares/rbac-core` role-hierarchy.ts. A HIGHER `level` outranks a
 * lower one:  super_admin (100) > owner (90) > admin (80) > manager (60) > clerk (40) > viewer (20).
 *
 *  - An actor may see / manage a role (or a user holding it) only if its level is STRICTLY LOWER than theirs.
 *  - Roles on the same level cannot see or manage each other; nobody sees upward.
 *  - An unknown actor role has no rank and sees nothing; an unknown *target* role counts as the lowest level.
 */
final class RoleHierarchy
{
    public const LEVEL_UNKNOWN_TARGET = 0;

    /**
     * @param list<array{code: string, level: int}> $roles
     */
    public static function levelOf(array $roles, ?string $code): ?int
    {
        if ($code === null) {
            return null;
        }
        $lower = strtolower($code);
        foreach ($roles as $role) {
            if (strtolower($role['code']) === $lower) {
                return $role['level'];
            }
        }

        return null;
    }

    public static function outranks(?int $actorLevel, ?int $targetLevel): bool
    {
        if ($actorLevel === null) {
            return false;
        }

        return $actorLevel > ($targetLevel ?? self::LEVEL_UNKNOWN_TARGET);
    }

    /**
     * @param list<array{code: string, level: int}> $roles
     */
    public static function canManage(array $roles, ?string $actorCode, ?string $targetCode): bool
    {
        return self::outranks(self::levelOf($roles, $actorCode), self::levelOf($roles, $targetCode));
    }

    /**
     * Roles strictly below the actor's. Empty for an unknown actor role.
     *
     * @template T of array{code: string, level: int}
     * @param list<T> $roles
     * @return list<T>
     */
    public static function visibleRoles(array $roles, ?string $actorCode): array
    {
        $actorLevel = self::levelOf($roles, $actorCode);

        return array_values(array_filter(
            $roles,
            static fn (array $r): bool => self::outranks($actorLevel, $r['level']),
        ));
    }
}
