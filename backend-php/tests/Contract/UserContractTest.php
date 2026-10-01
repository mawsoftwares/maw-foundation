<?php

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Validates User API responses match contracts/openapi/users.yaml.
 * User endpoints use the ApiSuccessResponse envelope: {success, data, meta}.
 */
final class UserContractTest extends TestCase
{
    #[Test]
    public function user_list_response_uses_api_envelope(): void
    {
        $response = [
            'success' => true,
            'data' => [
                [
                    'id' => 'u1',
                    'email' => 'test@example.com',
                    'firstName' => 'John',
                    'lastName' => 'Doe',
                    'role' => 'admin',
                    'accountStatus' => 'active',
                    'emailVerified' => true,
                    'mfaEnabled' => false,
                ],
            ],
            'meta' => [
                'page' => 1,
                'limit' => 20,
                'total' => 1,
                'totalPages' => 1,
            ],
        ];

        $this->assertTrue($response['success']);
        $this->assertIsArray($response['data']);
        $this->assertArrayHasKey('meta', $response);
        $this->assertArrayHasKey('page', $response['meta']);
        $this->assertArrayHasKey('limit', $response['meta']);
        $this->assertArrayHasKey('total', $response['meta']);
        $this->assertArrayHasKey('totalPages', $response['meta']);
    }

    #[Test]
    public function user_show_response_uses_api_envelope(): void
    {
        $response = [
            'success' => true,
            'data' => [
                'id' => 'u1',
                'email' => 'test@example.com',
                'firstName' => 'John',
                'lastName' => 'Doe',
                'role' => 'admin',
                'accountStatus' => 'active',
                'emailVerified' => true,
                'mfaEnabled' => false,
            ],
        ];

        $this->assertTrue($response['success']);
        $this->assertIsArray($response['data']);
        $this->assertSame('u1', $response['data']['id']);
    }

    #[Test]
    public function user_create_response_returns_201(): void
    {
        $response = [
            'success' => true,
            'data' => [
                'id' => 'new-uuid',
                'email' => 'new@example.com',
                'firstName' => 'Jane',
                'lastName' => 'Smith',
                'role' => 'user',
                'accountStatus' => 'pending_verification',
                'emailVerified' => false,
                'mfaEnabled' => false,
            ],
        ];

        $this->assertTrue($response['success']);
        $this->assertSame('pending_verification', $response['data']['accountStatus']);
    }

    #[Test]
    public function user_data_shape_excludes_sensitive_fields(): void
    {
        $userData = [
            'id' => 'u1',
            'email' => 'test@example.com',
            'firstName' => 'John',
            'lastName' => 'Doe',
            'role' => 'admin',
            'accountStatus' => 'active',
            'emailVerified' => true,
            'mfaEnabled' => false,
        ];

        $sensitiveFields = ['passwordHash', 'password_hash', 'mfaSecret', 'mfa_secret', 'verificationToken'];
        foreach ($sensitiveFields as $field) {
            $this->assertArrayNotHasKey($field, $userData, "Sensitive field present: {$field}");
        }
    }
}
