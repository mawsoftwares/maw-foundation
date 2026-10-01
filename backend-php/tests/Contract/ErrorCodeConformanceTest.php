<?php

declare(strict_types=1);

namespace Tests\Contract;

use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\Exceptions\ForbiddenException;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\Exceptions\UnauthorizedException;
use App\Domain\Shared\Exceptions\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Validates PHP exception error codes match contracts/errors/error-codes.json.
 * This test reads the shared error codes JSON and verifies the PHP exception
 * hierarchy maps to the same codes with the same HTTP status.
 */
final class ErrorCodeConformanceTest extends TestCase
{
    /**
     * @var array<string, array{httpStatus: int, description: string}>
     */
    private array $contractCodes;

    protected function setUp(): void
    {
        $jsonPath = dirname(__DIR__, 3) . '/contracts/errors/error-codes.json';
        if (! file_exists($jsonPath)) {
            $this->markTestSkipped('error-codes.json not found — run from monorepo root');
        }

        $json = json_decode(file_get_contents($jsonPath), true);
        $this->contractCodes = $json['codes'];
    }

    #[Test]
    public function validation_exception_maps_to_contract(): void
    {
        $e = new ValidationException('test');
        $this->assertCodeMatchesContract($e->errorCode(), $e->httpStatus(), 'ValidationException');
    }

    #[Test]
    public function not_found_exception_maps_to_contract(): void
    {
        $e = new NotFoundException('test');
        $this->assertCodeMatchesContract($e->errorCode(), $e->httpStatus(), 'NotFoundException');
    }

    #[Test]
    public function unauthorized_exception_maps_to_contract(): void
    {
        $e = new UnauthorizedException('UNAUTHORIZED', 'test');
        $this->assertContractHasCode('UNAUTHORIZED');
        $this->assertSame(401, $e->httpStatus());
    }

    #[Test]
    public function unauthorized_with_invalid_credentials_maps_to_contract(): void
    {
        $e = new UnauthorizedException('INVALID_CREDENTIALS', 'test');
        $this->assertContractHasCode('INVALID_CREDENTIALS');
        $this->assertSame(401, $e->httpStatus());
    }

    #[Test]
    public function unauthorized_with_token_expired_maps_to_contract(): void
    {
        $e = new UnauthorizedException('TOKEN_EXPIRED', 'test');
        $this->assertContractHasCode('TOKEN_EXPIRED');
        $this->assertSame(401, $e->httpStatus());
    }

    #[Test]
    public function forbidden_exception_maps_to_contract(): void
    {
        $e = new ForbiddenException('test');
        $this->assertCodeMatchesContract($e->errorCode(), $e->httpStatus(), 'ForbiddenException');
    }

    #[Test]
    public function conflict_exception_maps_to_contract(): void
    {
        $e = new ConflictException('test');
        $this->assertCodeMatchesContract($e->errorCode(), $e->httpStatus(), 'ConflictException');
    }

    #[Test]
    public function all_contract_error_codes_have_valid_format(): void
    {
        foreach (array_keys($this->contractCodes) as $code) {
            $this->assertMatchesRegularExpression(
                '/^[A-Z][A-Z_]+$/',
                $code,
                "Error code '{$code}' doesn't match UPPER_SNAKE_CASE format",
            );
        }
    }

    #[Test]
    public function all_contract_error_codes_have_valid_http_status(): void
    {
        foreach ($this->contractCodes as $code => $spec) {
            $status = $spec['httpStatus'];
            $this->assertGreaterThanOrEqual(400, $status, "Error code '{$code}' has non-error HTTP status {$status}");
            $this->assertLessThan(600, $status, "Error code '{$code}' has invalid HTTP status {$status}");
        }
    }

    #[Test]
    public function php_exceptions_cover_primary_error_codes(): void
    {
        $phpCodes = [
            'VALIDATION_ERROR' => 400,
            'NOT_FOUND' => 404,
            'UNAUTHORIZED' => 401,
            'INVALID_CREDENTIALS' => 401,
            'TOKEN_EXPIRED' => 401,
            'FORBIDDEN' => 403,
            'CONFLICT' => 409,
        ];

        foreach ($phpCodes as $code => $expectedStatus) {
            if ($code === 'VALIDATION_ERROR') {
                $contractCode = 'VALIDATION_FAILED';
            } else {
                $contractCode = $code;
            }

            $this->assertArrayHasKey(
                $contractCode,
                $this->contractCodes,
                "PHP code '{$code}' maps to '{$contractCode}' which is not in contract",
            );
        }
    }

    private function assertCodeMatchesContract(string $phpCode, int $phpStatus, string $exceptionClass): void
    {
        $contractKey = $this->mapPhpCodeToContract($phpCode);

        $this->assertArrayHasKey(
            $contractKey,
            $this->contractCodes,
            "{$exceptionClass} code '{$phpCode}' (mapped to '{$contractKey}') not found in contract",
        );

        $contractStatus = $this->contractCodes[$contractKey]['httpStatus'];
        $this->assertSame(
            $contractStatus,
            $phpStatus,
            "{$exceptionClass}: HTTP status {$phpStatus} doesn't match contract {$contractStatus} for code '{$contractKey}'",
        );
    }

    private function assertContractHasCode(string $code): void
    {
        $this->assertArrayHasKey($code, $this->contractCodes, "Code '{$code}' not in contract");
    }

    private function mapPhpCodeToContract(string $phpCode): string
    {
        return match ($phpCode) {
            'VALIDATION_ERROR' => 'VALIDATION_FAILED',
            default => $phpCode,
        };
    }
}
