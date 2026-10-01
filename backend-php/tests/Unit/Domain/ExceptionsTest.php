<?php

declare(strict_types=1);

namespace Tests\Unit\Domain;

use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\Exceptions\ForbiddenException;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\Exceptions\UnauthorizedException;
use App\Domain\Shared\Exceptions\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class ExceptionsTest extends TestCase
{
    #[Test]
    public function validation_exception_has_400_status(): void
    {
        $e = new ValidationException('Bad input');
        $this->assertSame(400, $e->httpStatus());
        $this->assertSame('VALIDATION_ERROR', $e->errorCode());

        $api = $e->toApiError();
        $this->assertSame('Bad input', $api['error']);
        $this->assertSame('VALIDATION_ERROR', $api['code']);
    }

    #[Test]
    public function validation_exception_with_violations(): void
    {
        $e = new ValidationException('Invalid', [
            ['field' => 'email', 'message' => 'required'],
        ]);

        $this->assertCount(1, $e->violations);
        $this->assertSame('email', $e->violations[0]['field']);
    }

    #[Test]
    public function not_found_exception_has_404_status(): void
    {
        $e = new NotFoundException('User not found');
        $this->assertSame(404, $e->httpStatus());
        $this->assertSame('NOT_FOUND', $e->errorCode());
    }

    #[Test]
    public function unauthorized_exception_has_401_status(): void
    {
        $e = new UnauthorizedException('INVALID_TOKEN', 'Token expired');
        $this->assertSame(401, $e->httpStatus());
        $this->assertSame('INVALID_TOKEN', $e->errorCode());

        $api = $e->toApiError();
        $this->assertSame('Token expired', $api['error']);
    }

    #[Test]
    public function forbidden_exception_has_403_status(): void
    {
        $e = new ForbiddenException('Not allowed');
        $this->assertSame(403, $e->httpStatus());
        $this->assertSame('FORBIDDEN', $e->errorCode());
    }

    #[Test]
    public function conflict_exception_has_409_status(): void
    {
        $e = new ConflictException('Already exists');
        $this->assertSame(409, $e->httpStatus());
        $this->assertSame('CONFLICT', $e->errorCode());
    }
}
