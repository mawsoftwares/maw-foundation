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

final class UserCrudTest extends TestCase
{
    use RefreshDatabase;

    private const TENANT_ID = 'test-tenant-001';

    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();

        $hasher = app(PasswordHasherInterface::class);
        $tokenService = app(TokenServiceInterface::class);

        UserModel::create([
            'id' => 'admin-001',
            'tenant_id' => self::TENANT_ID,
            'email' => 'admin@example.com',
            'password_hash' => $hasher->hash('adminpass'),
            'first_name' => 'Admin',
            'last_name' => 'User',
            'role' => 'admin',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $this->adminToken = $tokenService->sign([
            'userId' => 'admin-001',
            'tenantId' => self::TENANT_ID,
            'role' => 'admin',
            'audience' => 'cashier',
            'expiresIn' => 900,
        ]);
    }

    #[Test]
    public function list_users_returns_paginated_envelope(): void
    {
        $response = $this->getJson('/api/users', [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'success',
            'data',
            'meta' => ['page', 'limit', 'total', 'totalPages'],
        ]);
        $response->assertJson(['success' => true]);
    }

    #[Test]
    public function create_user_returns_201_with_envelope(): void
    {
        $response = $this->postJson('/api/users', [
            'email' => 'newuser@example.com',
            'password' => 'securepass123',
            'firstName' => 'New',
            'lastName' => 'User',
            'role' => 'user',
        ], [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertCreated();
        $response->assertJson([
            'success' => true,
            'data' => [
                'email' => 'newuser@example.com',
                'firstName' => 'New',
                'accountStatus' => 'pending_verification',
            ],
        ]);
    }

    #[Test]
    public function show_user_returns_single_user(): void
    {
        $response = $this->getJson('/api/users/admin-001', [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'data' => ['id' => 'admin-001', 'email' => 'admin@example.com'],
        ]);
    }

    #[Test]
    public function show_nonexistent_user_returns_404(): void
    {
        $response = $this->getJson('/api/users/nonexistent', [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertNotFound();
    }

    #[Test]
    public function update_user_changes_fields(): void
    {
        $response = $this->putJson('/api/users/admin-001', [
            'firstName' => 'Updated',
            'lastName' => 'Name',
        ], [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertOk();
        $response->assertJson([
            'success' => true,
            'data' => ['firstName' => 'Updated', 'lastName' => 'Name'],
        ]);
    }

    #[Test]
    public function activate_sets_account_active(): void
    {
        $hasher = app(PasswordHasherInterface::class);

        UserModel::create([
            'id' => 'user-suspended',
            'tenant_id' => self::TENANT_ID,
            'email' => 'suspended@example.com',
            'password_hash' => $hasher->hash('pass'),
            'first_name' => 'Suspended',
            'last_name' => 'User',
            'role' => 'user',
            'account_status' => AccountStatus::SUSPENDED->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $response = $this->postJson('/api/users/user-suspended/activate', [], [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertOk();
        $response->assertJson([
            'data' => ['accountStatus' => 'active'],
        ]);
    }

    #[Test]
    public function deactivate_sets_account_suspended(): void
    {
        $response = $this->postJson('/api/users/admin-001/deactivate', [], [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertOk();
        $response->assertJson([
            'data' => ['accountStatus' => 'suspended'],
        ]);
    }

    #[Test]
    public function delete_user_returns_success(): void
    {
        $hasher = app(PasswordHasherInterface::class);

        UserModel::create([
            'id' => 'user-to-delete',
            'tenant_id' => self::TENANT_ID,
            'email' => 'delete@example.com',
            'password_hash' => $hasher->hash('pass'),
            'first_name' => 'Delete',
            'last_name' => 'Me',
            'role' => 'user',
            'account_status' => AccountStatus::ACTIVE->value,
            'email_verified' => true,
            'failed_login_attempts' => 0,
            'mfa_enabled' => false,
        ]);

        $response = $this->deleteJson('/api/users/user-to-delete', [], [
            'Authorization' => "Bearer {$this->adminToken}",
        ]);

        $response->assertOk();
        $response->assertJson(['success' => true]);

        $this->assertDatabaseMissing('users', ['id' => 'user-to-delete']);
    }

    #[Test]
    public function unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/users');

        $response->assertUnauthorized();
    }
}
