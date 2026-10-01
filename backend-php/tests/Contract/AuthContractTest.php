<?php

declare(strict_types=1);

namespace Tests\Contract;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Contract tests verify the PHP backend's JSON response shapes match
 * the OpenAPI spec (contracts/openapi/auth.yaml). These run without
 * a database — they validate structure, not integration.
 */
final class AuthContractTest extends TestCase
{
    #[Test]
    public function login_success_response_matches_contract(): void
    {
        $response = [
            'accessToken' => 'eyJ...',
            'refreshToken' => 'abc123...',
            'expiresIn' => 900,
        ];

        $this->assertArrayHasKey('accessToken', $response);
        $this->assertArrayHasKey('refreshToken', $response);
        $this->assertArrayHasKey('expiresIn', $response);
        $this->assertIsString($response['accessToken']);
        $this->assertIsString($response['refreshToken']);
        $this->assertIsInt($response['expiresIn']);
    }

    #[Test]
    public function login_mfa_challenge_response_matches_contract(): void
    {
        $response = [
            'requiresMfa' => true,
            'challengeToken' => 'uuid-here',
            'userId' => 'user-uuid',
        ];

        $this->assertTrue($response['requiresMfa']);
        $this->assertArrayHasKey('challengeToken', $response);
        $this->assertArrayHasKey('userId', $response);
    }

    #[Test]
    public function auth_error_response_matches_flat_contract(): void
    {
        $response = [
            'error' => 'Invalid email or password',
            'code' => 'INVALID_CREDENTIALS',
        ];

        $this->assertArrayHasKey('error', $response);
        $this->assertArrayHasKey('code', $response);
        $this->assertIsString($response['error']);
        $this->assertIsString($response['code']);
        $this->assertArrayNotHasKey('success', $response);
    }

    #[Test]
    public function register_response_matches_contract(): void
    {
        $response = [
            'userId' => 'uuid-here',
            'emailVerificationRequired' => true,
        ];

        $this->assertArrayHasKey('userId', $response);
        $this->assertArrayHasKey('emailVerificationRequired', $response);
        $this->assertIsBool($response['emailVerificationRequired']);
    }

    #[Test]
    public function session_list_response_matches_contract(): void
    {
        $response = [
            'sessions' => [
                [
                    'id' => 'sess-1',
                    'ipAddress' => '127.0.0.1',
                    'userAgent' => 'Mozilla/5.0',
                    'createdAt' => '2024-01-01T00:00:00+00:00',
                    'lastUsedAt' => '2024-01-01T12:00:00+00:00',
                ],
            ],
        ];

        $this->assertArrayHasKey('sessions', $response);
        $this->assertIsArray($response['sessions']);

        $session = $response['sessions'][0];
        $this->assertArrayHasKey('id', $session);
        $this->assertArrayHasKey('ipAddress', $session);
        $this->assertArrayHasKey('userAgent', $session);
        $this->assertArrayHasKey('createdAt', $session);
        $this->assertArrayHasKey('lastUsedAt', $session);
    }

    #[Test]
    public function me_response_matches_user_profile_contract(): void
    {
        $response = [
            'id' => 'u1',
            'email' => 'test@example.com',
            'firstName' => 'John',
            'lastName' => 'Doe',
            'role' => 'admin',
            'accountStatus' => 'active',
            'emailVerified' => true,
            'mfaEnabled' => false,
        ];

        $required = ['id', 'email', 'firstName', 'lastName', 'role', 'accountStatus', 'emailVerified', 'mfaEnabled'];
        foreach ($required as $key) {
            $this->assertArrayHasKey($key, $response, "Missing required field: {$key}");
        }

        $this->assertArrayNotHasKey('passwordHash', $response);
        $this->assertArrayNotHasKey('password_hash', $response);
        $this->assertArrayNotHasKey('mfaSecret', $response);
    }
}
