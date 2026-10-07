<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Shared\Contracts\AccountStatus;
use App\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

/** The Node backend serves /health and /auth/* at the root; PHP serves them there AND under /api/v1. */
final class RootAliasTest extends TestCase
{
    use DatabaseTransactions;

    private const TENANT = 'alias-tenant';

    private function makeUser(): void
    {
        UserModel::create([
            'id' => 'alias-user',
            'tenant_id' => self::TENANT,
            'email' => 'alias@example.com',
            'password_hash' => app(PasswordHasherInterface::class)->hash('password123'),
            'name' => 'Alias User',
            'role' => 'viewer',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'mfa_enabled' => false,
        ]);
    }

    #[Test]
    public function health_answers_at_the_root_and_under_v1(): void
    {
        foreach (['/health', '/api/v1/health'] as $path) {
            $this->getJson($path)->assertOk()->assertJson(['status' => 'ok']);
        }
    }

    #[Test]
    public function login_and_me_work_at_the_root_exactly_like_under_v1(): void
    {
        $this->makeUser();
        $body = ['email' => 'alias@example.com', 'password' => 'password123', 'tenantId' => self::TENANT];

        $profiles = [];
        foreach (['/auth', '/api/v1/auth'] as $base) {
            $token = $this->postJson("{$base}/login", $body)->assertOk()->assertJsonStructure(['accessToken', 'refreshToken', 'expiresIn'])->json('accessToken');
            $profiles[$base] = $this->getJson("{$base}/me", ['Authorization' => "Bearer {$token}"])->assertOk()->json();
        }

        $this->assertSame($profiles['/auth']['id'], $profiles['/api/v1/auth']['id']);
        $this->assertSame('alias@example.com', $profiles['/auth']['email']);
    }

    #[Test]
    public function errors_have_the_same_json_shape_at_the_root(): void
    {
        foreach (['/auth', '/api/v1/auth'] as $base) {
            $this->postJson("{$base}/login", ['email' => 'nobody@example.com', 'password' => 'x', 'tenantId' => self::TENANT])
                ->assertUnauthorized()
                ->assertJson(['code' => 'INVALID_CREDENTIALS']);
            $this->getJson("{$base}/me")->assertUnauthorized()->assertJson(['code' => 'UNAUTHORIZED']);
        }
    }

    #[Test]
    public function resources_stay_under_v1_only(): void
    {
        $this->getJson('/users')->assertNotFound();
        $this->getJson('/api/users')->assertNotFound();
    }
}
