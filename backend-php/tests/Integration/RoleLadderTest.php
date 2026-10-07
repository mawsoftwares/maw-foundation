<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Auth\TokenServiceInterface;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/**
 * Strict role ladder over the real shared schema (master_roles / role_permissions / users):
 * super_admin(100) > admin(80) = admin_b(80) > manager(60) > viewer(20).
 */
final class RoleLadderTest extends TestCase
{
    use DatabaseTransactions;

    private const TENANT = 'ladder-tenant';

    protected function setUp(): void
    {
        parent::setUp();

        // Password hashing is covered elsewhere; keep this test about the ladder only.
        $this->app->instance(PasswordHasherInterface::class, new class implements PasswordHasherInterface {
            public function hash(string $password): string
            {
                return 'stub$' . $password;
            }

            public function verify(string $password, string $hash): bool
            {
                return $hash === 'stub$' . $password;
            }

            public function needsRehash(string $hash): bool
            {
                return false;
            }
        });

        $perm = [];
        foreach (['Read_Users', 'Create_Users', 'Update_Users', 'Delete_Users', 'Manage_Rbac', 'Manage_Secret'] as $code) {
            $perm[$code] = (int) DB::selectOne('INSERT INTO master_permissions (code, name) VALUES (?, ?) RETURNING id', ['ladder.' . $code, $code])->id;
            // Real codes are what the gate looks up; re-point the row at the plain code for this transaction.
            DB::update('UPDATE master_permissions SET code = ? WHERE id = ?', [$code, $perm[$code]]);
        }
        $role = [];
        foreach ([['super_admin', 100], ['admin', 80], ['admin_b', 80], ['manager', 60], ['viewer', 20]] as [$code, $level]) {
            $role[$code] = (int) DB::selectOne('INSERT INTO master_roles (code, name, level) VALUES (?, ?, ?) ON CONFLICT (code) DO UPDATE SET level = EXCLUDED.level, is_active = TRUE RETURNING id', ['ladder_' . $code, $code, $level])->id;
            DB::update('UPDATE master_roles SET code = ? WHERE id = ?', [$code, $role[$code]]);
        }
        $grant = static function (string $roleCode, array $codes) use ($role, $perm): void {
            DB::delete('DELETE FROM role_permissions WHERE role_id = ?', [$role[$roleCode]]);
            foreach ($codes as $c) {
                DB::insert('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [$role[$roleCode], $perm[$c]]);
            }
        };
        $grant('super_admin', array_keys($perm));
        $grant('admin', ['Read_Users', 'Create_Users', 'Update_Users', 'Delete_Users', 'Manage_Rbac']); // NOT Manage_Secret
        $grant('manager', ['Read_Users']);
        $grant('viewer', []);

        foreach ([['u-sa', 'super_admin'], ['u-admin', 'admin'], ['u-admin-b', 'admin_b'], ['u-mgr', 'manager'], ['u-viewer', 'viewer']] as [$id, $r]) {
            DB::insert(
                "INSERT INTO users (id, tenant_id, email, role, audience, password_hash, name, account_status) VALUES (?, ?, ?, ?, 'admin', 'x', ?, 'ACTIVE')",
                [$id, self::TENANT, "{$id}@ladder.test", $r, $id],
            );
        }
    }

    /** @return array<string, string> */
    private function as(string $userId): array
    {
        $role = (string) DB::selectOne('SELECT role FROM users WHERE id = ?', [$userId])->role;
        $token = app(TokenServiceInterface::class)->sign([
            'userId' => $userId, 'tenantId' => self::TENANT, 'role' => $role, 'audience' => 'admin', 'jti' => bin2hex(random_bytes(8)), 'expiresIn' => 600,
        ]);

        return ['Authorization' => 'Bearer ' . $token];
    }

    /** @return list<string> */
    private function listedIds(string $as): array
    {
        $res = $this->getJson('/api/v1/users?pageSize=100', $this->as($as))->assertOk();

        return array_map(static fn (array $u): string => $u['id'], $res->json('data'));
    }

    #[Test]
    public function super_admin_sees_every_role_below_it(): void
    {
        $ids = $this->listedIds('u-sa');
        sort($ids);
        $this->assertSame(['u-admin', 'u-admin-b', 'u-mgr', 'u-sa', 'u-viewer'], $ids);
    }

    #[Test]
    public function admin_sees_only_lower_roles_and_itself(): void
    {
        $ids = $this->listedIds('u-admin');
        sort($ids);
        $this->assertSame(['u-admin', 'u-mgr', 'u-viewer'], $ids); // no super_admin, no same-level admin_b
    }

    #[Test]
    public function hidden_users_answer_404_for_every_action(): void
    {
        $h = $this->as('u-admin');
        foreach (['u-sa', 'u-admin-b'] as $hidden) {
            $this->getJson("/api/v1/users/{$hidden}", $h)->assertNotFound();
            $this->patchJson("/api/v1/users/{$hidden}", ['firstName' => 'x'], $h)->assertNotFound();
            $this->deleteJson("/api/v1/users/{$hidden}", [], $h)->assertNotFound();
            $this->postJson("/api/v1/users/{$hidden}/deactivate", [], $h)->assertNotFound();
            $this->postJson("/api/v1/users/{$hidden}/reset-password", ['newPassword' => 'password123'], $h)->assertNotFound();
        }
        $this->getJson('/api/v1/users/u-admin', $h)->assertOk(); // always reachable: yourself
    }

    #[Test]
    public function role_assignment_is_bounded_by_the_ladder(): void
    {
        $h = $this->as('u-admin');
        $this->patchJson('/api/v1/users/u-mgr', ['role' => 'admin'], $h)->assertForbidden();
        $this->patchJson('/api/v1/users/u-mgr', ['role' => 'super_admin'], $h)->assertForbidden();
        $this->patchJson('/api/v1/users/u-mgr', ['role' => 'viewer'], $h)->assertOk()->assertJsonPath('data.role', 'viewer');

        $new = ['email' => 'new@ladder.test', 'firstName' => 'New', 'password' => 'password123'];
        $this->postJson('/api/v1/users', $new + ['role' => 'super_admin'], $h)->assertForbidden();
        $this->postJson('/api/v1/users', $new + ['role' => 'ghost'], $h)->assertForbidden();
        $this->postJson('/api/v1/users', $new + ['role' => 'viewer'], $h)->assertCreated()->assertJsonPath('data.role', 'viewer');
        $this->postJson('/api/v1/users', $new + ['role' => 'viewer'], $h)->assertStatus(409);
    }

    #[Test]
    public function admin_can_edit_own_profile_without_escalating(): void
    {
        $h = $this->as('u-admin');
        $this->patchJson('/api/v1/users/u-admin', ['firstName' => 'Renamed', 'role' => 'admin'], $h)->assertOk();
        $this->patchJson('/api/v1/users/u-admin', ['role' => 'super_admin'], $h)->assertForbidden();
    }

    #[Test]
    public function role_lists_only_show_roles_below_the_caller(): void
    {
        $h = $this->as('u-admin');
        $codes = static fn (array $rows): array => array_column($rows, 'code');
        $picker = $codes($this->getJson('/api/v1/roles', $h)->assertOk()->json('data'));
        $this->assertContains('manager', $picker);
        $this->assertNotContains('super_admin', $picker);
        $this->assertNotContains('admin', $picker);
        $this->assertNotContains('admin_b', $picker);

        $admin = $codes($this->getJson('/api/v1/rbac/roles', $h)->assertOk()->json('data'));
        $this->assertNotContains('super_admin', $admin);
        $this->assertNotContains('admin_b', $admin);
        $this->assertContains('viewer', $admin);

        $this->getJson('/api/v1/rbac/roles', $this->as('u-sa'))->assertOk();
    }

    #[Test]
    public function roles_can_only_be_created_or_moved_below_the_caller(): void
    {
        $h = $this->as('u-admin');
        $this->postJson('/api/v1/rbac/roles', ['code' => 'peer', 'name' => 'Peer', 'level' => 80], $h)->assertForbidden();
        $this->postJson('/api/v1/rbac/roles', ['code' => 'above', 'name' => 'Above', 'level' => 95], $h)->assertForbidden();
        $id = $this->postJson('/api/v1/rbac/roles', ['code' => 'junior', 'name' => 'Junior', 'level' => 50], $h)->assertCreated()->json('data.id');
        $this->putJson("/api/v1/rbac/roles/{$id}", ['level' => 90], $h)->assertForbidden();
        $this->putJson("/api/v1/rbac/roles/{$id}", ['level' => 40], $h)->assertOk()->assertJsonPath('data.level', 40);

        $saId = (int) DB::selectOne("SELECT id FROM master_roles WHERE code = 'super_admin'")->id;
        $this->getJson("/api/v1/rbac/roles/{$saId}", $h)->assertNotFound();
        $this->putJson("/api/v1/rbac/roles/{$saId}", ['name' => 'Hacked'], $h)->assertNotFound();
        $this->deleteJson("/api/v1/rbac/roles/{$saId}", [], $h)->assertNotFound();
    }

    #[Test]
    public function permissions_can_only_be_granted_if_the_caller_holds_them(): void
    {
        $h = $this->as('u-admin');
        $mgrId = (int) DB::selectOne("SELECT id FROM master_roles WHERE code = 'manager'")->id;
        $pid = static fn (string $c): int => (int) DB::selectOne('SELECT id FROM master_permissions WHERE code = ?', [$c])->id;

        $this->postJson("/api/v1/rbac/roles/{$mgrId}/permissions", ['assignments' => [['permissionId' => $pid('Read_Users')], ['permissionId' => $pid('Manage_Secret')]]], $h)->assertForbidden();
        $this->postJson("/api/v1/rbac/roles/{$mgrId}/permissions", ['assignments' => [['permissionId' => $pid('Read_Users')], ['permissionId' => $pid('Update_Users')]]], $h)->assertOk();
        $this->assertEqualsCanonicalizing([$pid('Read_Users'), $pid('Update_Users')], array_column($this->getJson("/api/v1/rbac/roles/{$mgrId}/permissions", $h)->json('data'), 'permissionId'));

        // The super admin holds Manage_Secret, so it may grant it.
        $this->postJson("/api/v1/rbac/roles/{$mgrId}/permissions", ['assignments' => [['permissionId' => $pid('Manage_Secret')]]], $this->as('u-sa'))->assertOk();
        // ...and an admin may not strip a permission it does not hold either.
        $this->postJson("/api/v1/rbac/roles/{$mgrId}/permissions", ['assignments' => []], $h)->assertForbidden();
    }

    #[Test]
    public function permission_gate_still_applies(): void
    {
        $this->getJson('/api/v1/users', $this->as('u-viewer'))->assertForbidden();
        $this->getJson('/api/v1/rbac/roles', $this->as('u-mgr'))->assertForbidden();
        $this->getJson('/api/v1/users')->assertUnauthorized();
    }
}
