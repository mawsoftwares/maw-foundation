<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Auth\PrehashResolver;
use App\Domain\Shared\Exceptions\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class PrehashResolverTest extends TestCase
{
    #[Test]
    public function it_extracts_hex_from_valid_prehashed_password(): void
    {
        $hex = str_repeat('ab', 32);
        $password = "sha256:{$hex}";

        $result = PrehashResolver::resolve($password, 'sha256', false);

        $this->assertSame($hex, $result);
    }

    #[Test]
    public function it_rejects_prehash_header_with_invalid_format(): void
    {
        $this->expectException(ValidationException::class);

        PrehashResolver::resolve('not-a-hash', 'sha256', false);
    }

    #[Test]
    public function it_passes_through_plain_password_when_prehash_not_required(): void
    {
        $result = PrehashResolver::resolve('mypassword', null, false);

        $this->assertSame('mypassword', $result);
    }

    #[Test]
    public function it_throws_when_prehash_required_but_not_provided(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Server requires password prehashing');

        PrehashResolver::resolve('mypassword', null, true);
    }

    #[Test]
    public function it_detects_valid_prehashed_password(): void
    {
        $hex = str_repeat('0f', 32);
        $this->assertTrue(PrehashResolver::isPrehashedPassword("sha256:{$hex}"));
    }

    #[Test]
    public function it_rejects_short_hex(): void
    {
        $this->assertFalse(PrehashResolver::isPrehashedPassword('sha256:abc'));
    }

    #[Test]
    public function it_rejects_missing_prefix(): void
    {
        $hex = str_repeat('ab', 32);
        $this->assertFalse(PrehashResolver::isPrehashedPassword($hex));
    }

    #[Test]
    public function it_rejects_uppercase_hex(): void
    {
        $hex = str_repeat('AB', 32);
        $this->assertFalse(PrehashResolver::isPrehashedPassword("sha256:{$hex}"));
    }
}
