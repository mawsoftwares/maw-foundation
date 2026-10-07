<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Domain\Auth\TokenServiceInterface;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** The theme is stored on the server, so one admin's change reaches every user of the tenant. */
final class SharedThemeTest extends TestCase
{
    use DatabaseTransactions;

    private const DESIGN_MD = "---\nname: Test\ncolors:\n  primary: \"#a855f7\"\n  background: \"#0f172a\"\n---";

    protected function setUp(): void
    {
        parent::setUp();

        DB::delete("DELETE FROM tenant_theme WHERE tenant_id IN ('theme-t1', 'theme-t2')");
        $perm = (int) DB::selectOne("INSERT INTO master_permissions (code, name) VALUES ('Manage_Theme', 'Manage Theme') ON CONFLICT (code) DO UPDATE SET is_active = TRUE RETURNING id")->id;
        $role = [];
        foreach (['theme_admin', 'theme_viewer'] as $code) {
            $role[$code] = (int) DB::selectOne('INSERT INTO master_roles (code, name, level) VALUES (?, ?, 10) ON CONFLICT (code) DO UPDATE SET is_active = TRUE RETURNING id', [$code, $code])->id;
            DB::delete('DELETE FROM role_permissions WHERE role_id = ?', [$role[$code]]);
        }
        DB::insert('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [$role['theme_admin'], $perm]);

        foreach ([['th-admin', 'theme_admin', 'theme-t1'], ['th-a', 'theme_viewer', 'theme-t1'], ['th-b', 'theme_viewer', 'theme-t1'], ['th-other', 'theme_viewer', 'theme-t2']] as [$id, $r, $tenant]) {
            DB::insert("INSERT INTO users (id, tenant_id, email, role, audience, password_hash, name, account_status) VALUES (?, ?, ?, ?, 'admin', 'x', ?, 'ACTIVE')", [$id, $tenant, "{$id}@theme.test", $r, $id]);
        }
    }

    /** @return array<string, string> */
    private function as(string $userId): array
    {
        $row = DB::selectOne('SELECT role, tenant_id FROM users WHERE id = ?', [$userId]);
        $token = app(TokenServiceInterface::class)->sign([
            'userId' => $userId, 'tenantId' => $row->tenant_id, 'role' => $row->role, 'audience' => 'admin', 'jti' => bin2hex(random_bytes(8)), 'expiresIn' => 600,
        ]);

        return ['Authorization' => 'Bearer ' . $token];
    }

    #[Test]
    public function starts_with_no_custom_theme(): void
    {
        $this->getJson('/api/v1/theme', $this->as('th-a'))->assertOk()->assertExactJson(['data' => null]);
    }

    #[Test]
    public function one_admin_sets_it_and_every_other_user_of_the_tenant_gets_it(): void
    {
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD], $this->as('th-admin'))->assertOk();

        foreach (['th-a', 'th-b', 'th-admin'] as $user) {
            $this->getJson('/api/v1/theme', $this->as($user))
                ->assertOk()
                ->assertJsonPath('data.designMd', self::DESIGN_MD)
                ->assertJsonPath('data.updatedBy', 'th-admin');
        }
    }

    #[Test]
    public function other_tenants_stay_separate(): void
    {
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD], $this->as('th-admin'))->assertOk();
        $this->getJson('/api/v1/theme', $this->as('th-other'))->assertOk()->assertExactJson(['data' => null]);
    }

    #[Test]
    public function only_manage_theme_may_change_or_reset_it(): void
    {
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD], $this->as('th-a'))->assertForbidden();
        $this->deleteJson('/api/v1/theme', [], $this->as('th-a'))->assertForbidden();
        $this->getJson('/api/v1/theme')->assertUnauthorized();
    }

    #[Test]
    public function rejects_bad_input_and_keeps_the_stored_theme(): void
    {
        $admin = $this->as('th-admin');
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD], $admin)->assertOk();

        $this->putJson('/api/v1/theme', [], $admin)->assertStatus(400);
        $this->putJson('/api/v1/theme', ['designMd' => '   '], $admin)->assertStatus(400);
        $this->putJson('/api/v1/theme', ['designMd' => 'just prose, no colors'], $admin)->assertStatus(400);
        $this->putJson('/api/v1/theme', ['designMd' => str_repeat('#fff ', 20000)], $admin)->assertStatus(400);

        $this->getJson('/api/v1/theme', $this->as('th-a'))->assertJsonPath('data.designMd', self::DESIGN_MD);
    }

    #[Test]
    public function the_login_page_can_read_the_theme_without_a_token_but_only_the_design_md(): void
    {
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD], $this->as('th-admin'))->assertOk();

        $res = $this->getJson('/api/v1/theme/public?tenantId=theme-t1')->assertOk()->assertExactJson(['data' => ['designMd' => self::DESIGN_MD]]);
        $this->assertStringContainsString('max-age', (string) $res->headers->get('Cache-Control'));

        // Unknown, malformed and other tenants all look the same: null (no tenant probing, no path tricks).
        $this->getJson('/api/v1/theme/public?tenantId=theme-t2')->assertExactJson(['data' => null]);
        $this->getJson('/api/v1/theme/public?tenantId=nope')->assertExactJson(['data' => null]);
        $this->getJson('/api/v1/theme/public?tenantId=' . rawurlencode('../../etc'))->assertExactJson(['data' => null]);
    }

    #[Test]
    public function the_public_read_falls_back_to_the_configured_default_tenant_and_opens_nothing_else(): void
    {
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD], $this->as('th-admin'))->assertOk();

        $this->getJson('/api/v1/theme/public')->assertExactJson(['data' => null]); // no default configured
        config(['auth.default_tenant_id' => 'theme-t1']);
        $this->getJson('/api/v1/theme/public')->assertJsonPath('data.designMd', self::DESIGN_MD);

        $this->getJson('/api/v1/theme')->assertUnauthorized();
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD])->assertUnauthorized();
        $this->deleteJson('/api/v1/theme')->assertUnauthorized();
    }

    #[Test]
    public function the_public_read_is_rate_limited_per_ip(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/v1/theme/public?tenantId=theme-t1')->assertOk();
        }
        $this->getJson('/api/v1/theme/public?tenantId=theme-t1')->assertStatus(429);
    }

    #[Test]
    public function reset_removes_it_for_everyone(): void
    {
        $admin = $this->as('th-admin');
        $this->putJson('/api/v1/theme', ['designMd' => self::DESIGN_MD], $admin)->assertOk();
        $this->deleteJson('/api/v1/theme', [], $admin)->assertOk();
        $this->getJson('/api/v1/theme', $this->as('th-b'))->assertExactJson(['data' => null]);
    }
}
