<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;
use App\Domain\Shared\ValueObjects\UserId;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class ValueObjectsTest extends TestCase
{
    #[Test]
    public function email_lowercases_input(): void
    {
        $email = Email::from('User@Example.COM');
        $this->assertSame('user@example.com', $email->value());
    }

    #[Test]
    public function email_rejects_invalid(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Email::from('not-an-email');
    }

    #[Test]
    public function email_equality(): void
    {
        $a = Email::from('test@example.com');
        $b = Email::from('TEST@example.com');
        $this->assertTrue($a->equals($b));
    }

    #[Test]
    public function user_id_from_string(): void
    {
        $uuid = '550e8400-e29b-41d4-a716-446655440000';
        $id = UserId::from($uuid);
        $this->assertSame($uuid, $id->value());
    }

    #[Test]
    public function user_id_generate_is_unique(): void
    {
        $a = UserId::generate();
        $b = UserId::generate();
        $this->assertNotSame($a->value(), $b->value());
    }

    #[Test]
    public function user_id_rejects_empty(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        UserId::from('');
    }

    #[Test]
    public function tenant_id_from_string(): void
    {
        $uuid = '660e8400-e29b-41d4-a716-446655440000';
        $id = TenantId::from($uuid);
        $this->assertSame($uuid, $id->value());
    }
}
