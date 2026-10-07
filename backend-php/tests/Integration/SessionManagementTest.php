<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Auth\TokenServiceInterface;
use App\Domain\Shared\Contracts\AccountStatus;
use App\Infrastructure\Persistence\Eloquent\Models\UserModel;
use App\Infrastructure\Persistence\Eloquent\Models\UserSessionModel;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class SessionManagementTest extends TestCase
{
    // The schema is owned by the Node migrations, so tests roll back instead of rebuilding (RefreshDatabase would drop it).
    use DatabaseTransactions;

    private const TENANT_ID = 'test-tenant-001';

    private string $userToken;

    protected function setUp(): void
    {
        parent::setUp();

        $hasher = app(PasswordHasherInterface::class);
        $tokenService = app(TokenServiceInterface::class);

        UserModel::create([
            'id' => 'user-001',
            'tenant_id' => self::TENANT_ID,
            'email' => 'user@example.com',
            'password_hash' => $hasher->hash('password'),
            'name' => 'Test User',
            'role' => 'user',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'mfa_enabled' => false,
        ]);

        $this->userToken = $tokenService->sign([
            'userId' => 'user-001',
            'tenantId' => self::TENANT_ID,
            'role' => 'user',
            'audience' => 'cashier',
            'expiresIn' => 900,
        ]);
    }

    #[Test]
    public function list_sessions_returns_user_sessions(): void
    {
        UserSessionModel::create([
            'id' => 'sess-001',
            'tenant_id' => self::TENANT_ID,
            'user_id' => 'user-001',
            'refresh_token_hash' => hash('sha256', 'token1'),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'created_at' => now(),
            'last_active_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->getJson('/api/v1/auth/sessions', [
            'Authorization' => "Bearer {$this->userToken}",
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'sessions' => [
                ['id', 'ipAddress', 'userAgent', 'createdAt', 'lastUsedAt'],
            ],
        ]);
    }

    #[Test]
    public function revoke_own_session_succeeds(): void
    {
        UserSessionModel::create([
            'id' => 'sess-to-revoke',
            'tenant_id' => self::TENANT_ID,
            'user_id' => 'user-001',
            'refresh_token_hash' => hash('sha256', 'token2'),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'created_at' => now(),
            'last_active_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->deleteJson('/api/v1/auth/sessions/sess-to-revoke', [], [
            'Authorization' => "Bearer {$this->userToken}",
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);
    }

    #[Test]
    public function revoke_other_users_session_returns_404(): void
    {
        UserSessionModel::create([
            'id' => 'sess-other',
            'tenant_id' => self::TENANT_ID,
            'user_id' => 'other-user',
            'refresh_token_hash' => hash('sha256', 'token3'),
            'ip_address' => '10.0.0.1',
            'user_agent' => 'Other',
            'created_at' => now(),
            'last_active_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->deleteJson('/api/v1/auth/sessions/sess-other', [], [
            'Authorization' => "Bearer {$this->userToken}",
        ]);

        $response->assertNotFound();
    }

    #[Test]
    public function revoke_all_sessions_returns_count(): void
    {
        UserSessionModel::create([
            'id' => 'sess-a',
            'tenant_id' => self::TENANT_ID,
            'user_id' => 'user-001',
            'refresh_token_hash' => hash('sha256', 'a'),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'A',
            'created_at' => now(),
            'last_active_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        UserSessionModel::create([
            'id' => 'sess-b',
            'tenant_id' => self::TENANT_ID,
            'user_id' => 'user-001',
            'refresh_token_hash' => hash('sha256', 'b'),
            'ip_address' => '127.0.0.1',
            'user_agent' => 'B',
            'created_at' => now(),
            'last_active_at' => now(),
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->deleteJson('/api/v1/auth/sessions', [], [
            'Authorization' => "Bearer {$this->userToken}",
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true, 'revokedCount' => 2]);
    }
}
