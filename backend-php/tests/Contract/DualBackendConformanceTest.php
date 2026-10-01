<?php

declare(strict_types=1);

namespace Tests\Contract;

use App\Domain\Auth\AuthTokens;
use App\Domain\Auth\SessionEntity;
use App\Domain\Rbac\ModuleEntity;
use App\Domain\Rbac\PermissionEntity;
use App\Domain\Rbac\RoleEntity;
use App\Domain\Shared\Contracts\AccountStatus;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\User\UserEntity;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Verifies PHP domain entities produce response shapes that match
 * the Node.js backend's JSON output, ensuring frontend compatibility.
 */
final class DualBackendConformanceTest extends TestCase
{
    #[Test]
    public function user_response_shape_matches_node(): void
    {
        $user = new UserEntity(
            id: 'u1',
            tenantId: 't1',
            email: Email::from('test@example.com'),
            passwordHash: 'hash',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            role: 'admin',
            accountStatus: AccountStatus::ACTIVE,
            emailVerified: true,
            failedLoginAttempts: 0,
            mfaEnabled: false,
            createdAt: new \DateTimeImmutable('2024-01-01T00:00:00+00:00'),
            updatedAt: new \DateTimeImmutable('2024-01-01T12:00:00+00:00'),
        );

        $response = $user->toResponse();

        // Node.js UserRecord.toResponse() returns these exact camelCase keys
        $expectedKeys = [
            'id', 'email', 'firstName', 'lastName', 'phone', 'role',
            'accountStatus', 'emailVerified', 'mfaEnabled', 'createdAt', 'updatedAt',
        ];

        foreach ($expectedKeys as $key) {
            $this->assertArrayHasKey($key, $response, "Missing Node-compatible key: {$key}");
        }

        // Must NOT have snake_case or sensitive fields
        $this->assertArrayNotHasKey('password_hash', $response);
        $this->assertArrayNotHasKey('passwordHash', $response);
        $this->assertArrayNotHasKey('tenant_id', $response);
        $this->assertArrayNotHasKey('tenantId', $response);
        $this->assertArrayNotHasKey('mfa_secret', $response);
        $this->assertArrayNotHasKey('failed_login_attempts', $response);
    }

    #[Test]
    public function auth_tokens_response_matches_node(): void
    {
        $tokens = new AuthTokens(
            accessToken: 'eyJ...',
            refreshToken: 'abc123',
            accessTokenExpiresIn: 900,
            refreshTokenExpiresIn: 604800,
        );

        $response = $tokens->toResponse();

        // Node.js returns {accessToken, refreshToken, expiresIn}
        $this->assertSame('eyJ...', $response['accessToken']);
        $this->assertSame('abc123', $response['refreshToken']);
        $this->assertSame(900, $response['expiresIn']);

        // Node does NOT include refreshTokenExpiresIn in the response
        $this->assertArrayNotHasKey('refreshTokenExpiresIn', $response);
    }

    #[Test]
    public function role_response_matches_node(): void
    {
        $role = new RoleEntity(
            id: 'r1',
            tenantId: 't1',
            name: 'Admin',
            slug: 'admin',
            description: 'Full access',
            isSystem: true,
            permissions: ['users.read', 'users.write'],
            createdAt: new \DateTimeImmutable('2024-01-01T00:00:00+00:00'),
        );

        $response = $role->toResponse();

        // Node's RbacController returns {id, name, slug, description, isSystem, permissions, createdAt, updatedAt}
        $this->assertSame('r1', $response['id']);
        $this->assertSame('Admin', $response['name']);
        $this->assertSame('admin', $response['slug']);
        $this->assertTrue($response['isSystem']);
        $this->assertSame(['users.read', 'users.write'], $response['permissions']);
        $this->assertArrayNotHasKey('tenantId', $response);
    }

    #[Test]
    public function session_response_matches_node(): void
    {
        $session = new SessionEntity(
            id: 's1',
            tenantId: 't1',
            userId: 'u1',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
            createdAt: new \DateTimeImmutable('2024-01-01T00:00:00+00:00'),
            lastUsedAt: new \DateTimeImmutable('2024-01-01T12:00:00+00:00'),
        );

        $response = $session->toResponse();

        // Node.js session list returns {id, ipAddress, userAgent, createdAt, lastUsedAt, current}
        $expectedKeys = ['id', 'ipAddress', 'userAgent', 'createdAt', 'lastUsedAt', 'current'];
        foreach ($expectedKeys as $key) {
            $this->assertArrayHasKey($key, $response, "Missing Node-compatible key: {$key}");
        }

        $this->assertArrayNotHasKey('tenantId', $response);
        $this->assertArrayNotHasKey('userId', $response);
    }

    #[Test]
    public function account_status_values_match_node_enum(): void
    {
        // Node.js AccountStatus enum values (from SDK)
        $nodeValues = ['active', 'suspended', 'pending_verification', 'deactivated', 'locked'];

        $phpValues = array_map(fn (AccountStatus $s) => $s->value, AccountStatus::cases());

        foreach ($nodeValues as $value) {
            $this->assertContains($value, $phpValues, "PHP missing Node AccountStatus value: {$value}");
        }
    }

    #[Test]
    public function module_tree_structure_matches_node(): void
    {
        $child = new ModuleEntity(
            id: 'm2',
            tenantId: 't1',
            name: 'Child',
            slug: 'child',
            parentId: 'm1',
            sortOrder: 1,
            isActive: true,
        );

        $parent = new ModuleEntity(
            id: 'm1',
            tenantId: 't1',
            name: 'Parent',
            slug: 'parent',
            parentId: null,
            sortOrder: 0,
            isActive: true,
            children: [$child],
        );

        $response = $parent->toResponse();

        // Node.js moduleTree returns recursive {children: [...]} arrays
        $this->assertIsArray($response['children']);
        $this->assertCount(1, $response['children']);
        $this->assertNull($response['parentId']);
        $this->assertSame('m1', $response['children'][0]['parentId']);
    }
}
