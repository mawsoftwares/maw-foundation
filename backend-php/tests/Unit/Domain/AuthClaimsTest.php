<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Auth\AuthClaims;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class AuthClaimsTest extends TestCase
{
    #[Test]
    public function it_serializes_to_array(): void
    {
        $claims = new AuthClaims(
            userId: 'u1',
            tenantId: 't1',
            role: 'admin',
            audience: 'cashier',
            jti: 'jti-123',
        );

        $array = $claims->toArray();

        $this->assertSame('u1', $array['userId']);
        $this->assertSame('t1', $array['tenantId']);
        $this->assertSame('admin', $array['role']);
        $this->assertSame('cashier', $array['audience']);
        $this->assertSame('jti-123', $array['jti']);
    }

    #[Test]
    public function it_omits_jti_when_null(): void
    {
        $claims = new AuthClaims(
            userId: 'u1',
            tenantId: 't1',
            role: 'user',
            audience: 'web',
        );

        $array = $claims->toArray();
        $this->assertArrayNotHasKey('jti', $array);
    }

    #[Test]
    public function it_deserializes_from_array(): void
    {
        $claims = AuthClaims::fromArray([
            'userId' => 'u2',
            'tenantId' => 't2',
            'role' => 'viewer',
            'audience' => 'admin',
            'jti' => 'abc',
        ]);

        $this->assertSame('u2', $claims->userId);
        $this->assertSame('abc', $claims->jti);
    }

    #[Test]
    public function it_handles_missing_fields_gracefully(): void
    {
        $claims = AuthClaims::fromArray([]);

        $this->assertSame('', $claims->userId);
        $this->assertSame('', $claims->tenantId);
        $this->assertNull($claims->jti);
    }
}
