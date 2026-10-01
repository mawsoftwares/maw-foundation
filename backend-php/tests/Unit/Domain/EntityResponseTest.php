<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Rbac\ModuleEntity;
use App\Domain\Rbac\PermissionEntity;
use App\Domain\Rbac\RoleEntity;
use App\Domain\Shared\Contracts\AccountStatus;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\User\UserEntity;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class EntityResponseTest extends TestCase
{
    #[Test]
    public function user_entity_toResponse_excludes_sensitive_fields(): void
    {
        $user = new UserEntity(
            id: 'u1',
            tenantId: 't1',
            email: Email::from('test@example.com'),
            passwordHash: 'secret-hash',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            role: 'admin',
            accountStatus: AccountStatus::ACTIVE,
            emailVerified: true,
            failedLoginAttempts: 0,
            mfaEnabled: false,
        );

        $response = $user->toResponse();

        $this->assertSame('u1', $response['id']);
        $this->assertSame('test@example.com', $response['email']);
        $this->assertSame('John', $response['firstName']);
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
        $this->assertSame('active', AccountStatus::ACTIVE->value);
        $this->assertSame('suspended', AccountStatus::SUSPENDED->value);
        $this->assertSame('pending_verification', AccountStatus::PENDING_VERIFICATION->value);
        $this->assertSame('deactivated', AccountStatus::DEACTIVATED->value);
        $this->assertSame('locked', AccountStatus::LOCKED->value);
    }
}
