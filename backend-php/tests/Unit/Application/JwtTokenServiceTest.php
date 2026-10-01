<?php

declare(strict_types=1);

namespace Tests\Unit\Application;

use App\Domain\Shared\Exceptions\UnauthorizedException;
use App\Infrastructure\Auth\JwtTokenService;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class JwtTokenServiceTest extends TestCase
{
    private JwtTokenService $service;

    protected function setUp(): void
    {
        $this->service = new JwtTokenService(
            secret: 'test-secret-at-least-32-characters-long',
            algorithm: 'HS256',
            issuer: 'test',
        );
    }

    #[Test]
    public function it_signs_and_verifies_a_token(): void
    {
        $token = $this->service->sign([
            'userId' => 'u1',
            'tenantId' => 't1',
            'role' => 'admin',
            'expiresIn' => 3600,
        ]);

        $claims = $this->service->verify($token);

        $this->assertSame('u1', $claims['userId']);
        $this->assertSame('t1', $claims['tenantId']);
        $this->assertSame('admin', $claims['role']);
        $this->assertSame('test', $claims['iss']);
        $this->assertArrayHasKey('iat', $claims);
        $this->assertArrayHasKey('exp', $claims);
    }

    #[Test]
    public function it_includes_jti_in_claims(): void
    {
        $token = $this->service->sign([
            'userId' => 'u1',
            'jti' => 'unique-id',
            'expiresIn' => 3600,
        ]);

        $claims = $this->service->verify($token);
        $this->assertSame('unique-id', $claims['jti']);
    }

    #[Test]
    public function it_rejects_tampered_token(): void
    {
        $token = $this->service->sign(['userId' => 'u1', 'expiresIn' => 3600]);

        $this->expectException(UnauthorizedException::class);

        $this->service->verify($token . 'tampered');
    }

    #[Test]
    public function it_rejects_token_signed_with_different_secret(): void
    {
        $other = new JwtTokenService(
            secret: 'different-secret-also-32-characters-long',
            algorithm: 'HS256',
            issuer: 'test',
        );

        $token = $other->sign(['userId' => 'u1', 'expiresIn' => 3600]);

        $this->expectException(UnauthorizedException::class);

        $this->service->verify($token);
    }

    #[Test]
    public function it_rejects_expired_token(): void
    {
        $token = $this->service->sign([
            'userId' => 'u1',
            'exp' => time() - 100,
        ]);

        $this->expectException(UnauthorizedException::class);

        $this->service->verify($token);
    }
}
