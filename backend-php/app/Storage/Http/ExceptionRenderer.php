<?php

declare(strict_types=1);

namespace App\Storage\Http;

use App\Domain\Shared\Exceptions\DomainException;
use App\Storage\Core\StorageException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException as LaravelValidationException;

/**
 * Renders every error on `api/v1/storage/*` in the contract's standard envelope
 * (`{success:false, error:{code, message, details?, requestId?}}`), including auth failures raised by the shared
 * middleware. Scoped to storage routes so the rest of the API keeps its current behaviour.
 */
final class ExceptionRenderer
{
    /** Codes defined by contracts/errors/error-codes.json. */
    private const CONTRACT_CODES = [
        'UNAUTHORIZED', 'TOKEN_EXPIRED', 'INVALID_CREDENTIALS', 'SESSION_EXPIRED', 'FORBIDDEN', 'OPERATION_NOT_ALLOWED',
        'FEATURE_DISABLED', 'ACCOUNT_DISABLED', 'NOT_FOUND', 'CONFLICT', 'ALREADY_EXISTS', 'DUPLICATE_EMAIL',
        'VALIDATION_FAILED', 'INVALID_INPUT', 'MISSING_FIELD', 'RATE_LIMITED', 'LIMIT_EXCEEDED', 'ACCOUNT_LOCKED',
        'INTERNAL', 'SERVICE_UNAVAILABLE', 'MFA_REQUIRED', 'INVALID_OTP', 'PASSWORD_POLICY', 'ACCOUNT_PENDING_VERIFICATION',
    ];

    public static function handles(Request $request): bool
    {
        return $request->is('api/v1/storage', 'api/v1/storage/*');
    }

    public function render(\Throwable $e, Request $request): ?JsonResponse
    {
        if (! self::handles($request)) {
            return null;
        }
        $requestId = $request->header('x-request-id');

        if ($e instanceof StorageException) {
            return new JsonResponse($e->toEnvelope($requestId), $e->httpStatus);
        }
        if ($e instanceof DomainException) {
            $code = in_array($e->errorCode, self::CONTRACT_CODES, true) ? $e->errorCode : self::codeFor($e->httpStatus);

            return new JsonResponse(self::envelope($code, $e->getMessage(), $requestId), $e->httpStatus);
        }
        if ($e instanceof LaravelValidationException) {
            return new JsonResponse(self::envelope('VALIDATION_FAILED', 'Validation failed', $requestId), 400);
        }

        return null; // unexpected errors fall through to the framework (500) — details are never echoed by us
    }

    /**
     * @return array<string, mixed>
     */
    private static function envelope(string $code, string $message, ?string $requestId): array
    {
        return ['success' => false, 'error' => array_filter(['code' => $code, 'message' => $message, 'requestId' => $requestId], static fn ($v) => $v !== null)];
    }

    private static function codeFor(int $status): string
    {
        return match ($status) {
            401 => 'UNAUTHORIZED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            409 => 'CONFLICT',
            400, 422 => 'VALIDATION_FAILED',
            503 => 'SERVICE_UNAVAILABLE',
            default => 'INTERNAL',
        };
    }
}
