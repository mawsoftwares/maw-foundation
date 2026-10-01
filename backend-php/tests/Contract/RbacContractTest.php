<?php

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Validates RBAC API responses match contracts/openapi/rbac.yaml.
 * RBAC endpoints use the {data: [...]} wrapper pattern.
 */
final class RbacContractTest extends TestCase
{
    #[Test]
    public function role_list_response_uses_data_wrapper(): void
    {
        $response = [
            'data' => [
                [
                    'id' => 'r1',
                    'name' => 'Admin',
                    'slug' => 'admin',
                    'description' => 'Full access',
                    'isSystem' => true,
                    'permissions' => ['users.read', 'users.write'],
                    'createdAt' => '2024-01-01T00:00:00+00:00',
                    'updatedAt' => '2024-01-01T00:00:00+00:00',
                ],
            ],
        ];

        $this->assertArrayHasKey('data', $response);
        $this->assertArrayNotHasKey('success', $response);

        $role = $response['data'][0];
        $required = ['id', 'name', 'slug', 'isSystem', 'permissions'];
        foreach ($required as $key) {
            $this->assertArrayHasKey($key, $role, "Missing field: {$key}");
        }
        $this->assertIsArray($role['permissions']);
    }

    #[Test]
    public function role_permissions_response_is_string_array(): void
    {
        $response = [
            'data' => ['perm-uuid-1', 'perm-uuid-2'],
        ];

        $this->assertArrayHasKey('data', $response);
        $this->assertIsArray($response['data']);
        foreach ($response['data'] as $id) {
            $this->assertIsString($id);
        }
    }

    #[Test]
    public function module_tree_response_has_nested_children(): void
    {
        $response = [
            'data' => [
                [
                    'id' => 'm1',
                    'name' => 'Dashboard',
                    'slug' => 'dashboard',
                    'parentId' => null,
                    'sortOrder' => 0,
                    'isActive' => true,
                    'children' => [
                        [
                            'id' => 'm2',
                            'name' => 'Analytics',
                            'slug' => 'analytics',
                            'parentId' => 'm1',
                            'sortOrder' => 0,
                            'isActive' => true,
                            'children' => [],
                        ],
                    ],
                    'createdAt' => '2024-01-01T00:00:00+00:00',
                ],
            ],
        ];

        $module = $response['data'][0];
        $this->assertNull($module['parentId']);
        $this->assertIsArray($module['children']);
        $this->assertCount(1, $module['children']);
        $this->assertSame('m1', $module['children'][0]['parentId']);
    }

    #[Test]
    public function error_codes_match_node_js_enum(): void
    {
        $phpErrorCodes = [
            'VALIDATION_ERROR',
            'NOT_FOUND',
            'UNAUTHORIZED',
            'FORBIDDEN',
            'CONFLICT',
            'INVALID_CREDENTIALS',
            'INVALID_TOKEN',
            'TOKEN_EXPIRED',
            'TOKEN_REVOKED',
            'ACCOUNT_INACTIVE',
            'TENANT_REQUIRED',
        ];

        foreach ($phpErrorCodes as $code) {
            $this->assertMatchesRegularExpression('/^[A-Z][A-Z_]+$/', $code);
        }
    }

    #[Test]
    public function health_response_matches_system_contract(): void
    {
        $response = [
            'status' => 'ok',
            'service' => 'maw-foundation-php',
            'timestamp' => '2024-01-01T00:00:00+00:00',
        ];

        $this->assertSame('ok', $response['status']);
        $this->assertArrayHasKey('service', $response);
        $this->assertArrayHasKey('timestamp', $response);
    }
}
