<?php

declare(strict_types=1);

namespace Tests\Integration;

use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Auth\TokenServiceInterface;
use App\Domain\Shared\Contracts\AccountStatus;
use App\Infrastructure\Persistence\Eloquent\Models\UserModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

final class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    private const TENANT_ID = 'test-tenant-001';

    #[Test]
    public function login_returns_tokens_for_valid_credentials(): void
    {
        $hasher = app(PasswordHasherInterface::class);

        UserModel::create([
            'id' => 'user-001',
            'tenant_id' => self::TENANT_ID,
            'email' => 'test@example.com',
            'password_hash' => $hasher->hash('password123'),
            'first_name' => 'Test',
            'last_name' => 'User',
            'role' => 'admin',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
            'tenantId' => self::TENANT_ID,
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'accessToken',
            'refreshToken',
            'expiresIn',
        ]);
    }

    #[Test]
    public function login_returns_401_for_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'wrong',
            'tenantId' => self::TENANT_ID,
        ]);

        $response->assertUnauthorized();
        $response->assertJsonStructure(['error', 'code']);
        $response->assertJson(['code' => 'INVALID_CREDENTIALS']);
    }

    #[Test]
    public function login_rejects_inactive_account(): void
    {
        $hasher = app(PasswordHasherInterface::class);

        UserModel::create([
            'id' => 'user-002',
            'tenant_id' => self::TENANT_ID,
            'email' => 'suspended@example.com',
            'password_hash' => $hasher->hash('password123'),
            'first_name' => 'Suspended',
            'last_name' => 'User',
            'role' => 'user',
            'account_status' => AccountStatus::SUSPENDED->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'password123',
            'tenantId' => self::TENANT_ID,
        ]);

        $response->assertUnauthorized();
        $response->assertJson(['code' => 'ACCOUNT_INACTIVE']);
    }

    #[Test]
    public function me_endpoint_returns_user_profile(): void
    {
        $hasher = app(PasswordHasherInterface::class);
        $tokenService = app(TokenServiceInterface::class);

        UserModel::create([
            'id' => 'user-003',
            'tenant_id' => self::TENANT_ID,
            'email' => 'me@example.com',
            'password_hash' => $hasher->hash('password123'),
            'first_name' => 'Current',
            'last_name' => 'User',
            'role' => 'admin',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $token = $tokenService->sign([
            'userId' => 'user-003',
            'tenantId' => self::TENANT_ID,
            'role' => 'admin',
            'audience' => 'cashier',
            'expiresIn' => 900,
        ]);

        $response = $this->getJson('/api/auth/me', [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();
        $response->assertJson([
            'id' => 'user-003',
            'email' => 'me@example.com',
            'firstName' => 'Current',
        ]);
        $response->assertJsonMissing(['passwordHash']);
    }

    #[Test]
    public function protected_route_rejects_missing_token(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertUnauthorized();
    }

    #[Test]
    public function logout_blacklists_token_jti(): void
    {
        $tokenService = app(TokenServiceInterface::class);

        $token = $tokenService->sign([
            'userId' => 'user-001',
            'tenantId' => self::TENANT_ID,
            'role' => 'admin',
            'audience' => 'cashier',
            'jti' => 'jti-to-blacklist',
            'expiresIn' => 900,
        ]);

        $response = $this->postJson('/api/auth/logout', [], [
            'Authorization' => "Bearer {$token}",
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);
    }

    #[Test]
    public function register_creates_user_with_pending_status(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'email' => 'newuser@example.com',
            'password' => 'securepass123',
            'firstName' => 'New',
            'lastName' => 'User',
            'tenantId' => self::TENANT_ID,
        ]);

        $response->assertCreated();
        $response->assertJsonStructure(['userId', 'emailVerificationRequired']);
        $response->assertJson(['emailVerificationRequired' => true]);

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'account_status' => 'pending_verification',
            'tenant_id' => self::TENANT_ID,
        ]);
    }

    #[Test]
    public function register_rejects_duplicate_email(): void
    {
        $hasher = app(PasswordHasherInterface::class);

        UserModel::create([
            'id' => 'user-existing',
            'tenant_id' => self::TENANT_ID,
            'email' => 'existing@example.com',
            'password_hash' => $hasher->hash('password'),
            'first_name' => 'Existing',
            'last_name' => 'User',
            'role' => 'user',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $response = $this->postJson('/api/auth/register', [
            'email' => 'existing@example.com',
            'password' => 'securepass123',
            'firstName' => 'Dup',
            'lastName' => 'User',
            'tenantId' => self::TENANT_ID,
        ]);

        $response->assertStatus(409);
    }

    #[Test]
    public function login_with_prehashed_password(): void
    {
        $hasher = app(PasswordHasherInterface::class);
        $plainPassword = 'password123';
        $prehash = hash('sha256', $plainPassword);

        UserModel::create([
            'id' => 'user-prehash',
            'tenant_id' => self::TENANT_ID,
            'email' => 'prehash@example.com',
            'password_hash' => $hasher->hash($prehash),
            'first_name' => 'Prehash',
            'last_name' => 'User',
            'role' => 'user',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'prehash@example.com',
            'password' => "sha256:{$prehash}",
            'tenantId' => self::TENANT_ID,
        ], [
            'x-password-prehashed' => 'sha256',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['accessToken', 'refreshToken', 'expiresIn']);
    }
}
