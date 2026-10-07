<?php

declare(strict_types=1);

namespace Tests\Unit\Access;

use App\Access\RoleHierarchy;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class RoleHierarchyTest extends TestCase
{
    private const ROLES = [
        ['code' => 'super_admin', 'level' => 100],
        ['code' => 'owner', 'level' => 90],
        ['code' => 'admin', 'level' => 80],
        ['code' => 'admin_b', 'level' => 80],
        ['code' => 'manager', 'level' => 60],
        ['code' => 'viewer', 'level' => 20],
    ];

    /** @param list<array{code: string, level: int}> $roles @return list<string> */
    private static function codes(array $roles): array
    {
        return array_column($roles, 'code');
    }

    #[Test]
    public function super_admin_sees_everything_below(): void
    {
        $this->assertSame(['owner', 'admin', 'admin_b', 'manager', 'viewer'], self::codes(RoleHierarchy::visibleRoles(self::ROLES, 'super_admin')));
    }

    #[Test]
    public function admin_sees_neither_above_nor_same_level(): void
    {
        $this->assertSame(['manager', 'viewer'], self::codes(RoleHierarchy::visibleRoles(self::ROLES, 'admin')));
        $this->assertFalse(RoleHierarchy::canManage(self::ROLES, 'admin', 'super_admin'));
        $this->assertFalse(RoleHierarchy::canManage(self::ROLES, 'admin', 'admin_b'));
        $this->assertFalse(RoleHierarchy::canManage(self::ROLES, 'admin', 'admin'));
    }

    #[Test]
    public function lowest_and_unknown_actors_see_nothing_and_unknown_targets_rank_lowest(): void
    {
        $this->assertSame([], RoleHierarchy::visibleRoles(self::ROLES, 'viewer'));
        $this->assertSame([], RoleHierarchy::visibleRoles(self::ROLES, 'ghost'));
        $this->assertFalse(RoleHierarchy::canManage(self::ROLES, null, 'viewer'));
        $this->assertTrue(RoleHierarchy::canManage(self::ROLES, 'viewer', 'ghost'));
        $this->assertSame(80, RoleHierarchy::levelOf(self::ROLES, 'ADMIN'));
    }
}
