<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Rbac\ModuleEntity;
use App\Domain\Rbac\PermissionEntity;
use App\Domain\Rbac\RoleEntity;
use App\Domain\Shared\Contracts\AccountStatus;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;
use App\Domain\Shared\ValueObjects\UserId;
use App\Domain\User\UserEntity;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class EntityResponseTest extends TestCase
{
    #[Test]
    public function user_entity_toResponse_excludes_sensitive_fields(): void
    {
        $user = new UserEntity(
            id: UserId::from('u1'),
            tenantId: TenantId::from('t1'),
            email: Email::from('test@example.com'),
            passwordHash: 'secret-hash',
            role: 'admin',
            audience: 'admin',
            scopeId: null,
            accountStatus: AccountStatus::ACTIVE,
            emailVerified: true,
            mfaEnabled: false,
            name: 'John Doe',
            lastLoginAt: null,
            createdAt: new \DateTimeImmutable('2024-01-01T00:00:00+00:00'),
            updatedAt: new \DateTimeImmutable('2024-01-01T12:00:00+00:00'),
        );

        $response = $user->toResponse();

        $this->assertSame('u1', $response['id']);
        $this->assertSame('test@example.com', $response['email']);
        $this->assertSame('John Doe', $response['name']);
        $this->assertArrayNotHasKey('passwordHash', $response);
        $this->assertArrayNotHasKey('password_hash', $response);
    }

    #[Test]
    public function role_entity_toResponse_includes_permissions(): void
    {
        $role = new RoleEntity(
            id: 'r1',
            tenantId: 't1',
            name: 'Admin',
            slug: 'admin',
            description: 'Full access',
            isSystem: true,
            permissions: ['users.read', 'users.write'],
        );

        $response = $role->toResponse();

        $this->assertSame('r1', $response['id']);
        $this->assertSame(['users.read', 'users.write'], $response['permissions']);
        $this->assertTrue($response['isSystem']);
    }

    #[Test]
    public function module_entity_toResponse_includes_nested_children(): void
    {
        $child = new ModuleEntity(
            id: 'm2',
            tenantId: 't1',
            name: 'Sub Module',
            slug: 'sub-module',
            parentId: 'm1',
            sortOrder: 0,
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

        $this->assertCount(1, $response['children']);
        $this->assertSame('m2', $response['children'][0]['id']);
    }

    #[Test]
    public function permission_entity_toResponse(): void
    {
        $perm = new PermissionEntity(
            id: 'p1',
            moduleId: 'm1',
            name: 'Read Users',
            slug: 'users.read',
            description: 'Can read user list',
        );

        $response = $perm->toResponse();

        $this->assertSame('p1', $response['id']);
        $this->assertSame('users.read', $response['slug']);
    }

    #[Test]
    public function account_status_enum_values_match_node(): void
    {
        // Mirrors packages/sdk/src/security/AccountStatus.ts and the users_account_status_check constraint.
        $this->assertSame('ACTIVE', AccountStatus::ACTIVE->value);
        $this->assertSame('SUSPENDED', AccountStatus::SUSPENDED->value);
        $this->assertSame('PENDING_VERIFICATION', AccountStatus::PENDING_VERIFICATION->value);
        $this->assertSame('DISABLED', AccountStatus::DISABLED->value);
        $this->assertSame('LOCKED', AccountStatus::LOCKED->value);
    }
}
