<?php

declare(strict_types=1);

namespace App\Shared\Exceptions;

use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\Exceptions\DomainException;
use App\Domain\Shared\Exceptions\ForbiddenException;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\Exceptions\UnauthorizedException;
use App\Domain\Shared\Exceptions\ValidationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException as LaravelValidationException;
use Throwable;

final class Handler extends ExceptionHandler
{
    /**
     * @return void
     */
    public function register(): void
    {
        $this->renderable(function (DomainException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return $this->domainErrorResponse($e);
            }

            return null;
        });

        $this->renderable(function (LaravelValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return new JsonResponse([
                    'error' => 'Validation failed',
                    'code' => 'VALIDATION_ERROR',
                    'violations' => $e->errors(),
                ], 422);
            }

            return null;
        });
    }

    private function domainErrorResponse(DomainException $e): JsonResponse
    {
        $body = $e->toApiError();

        if ($e instanceof ValidationException && $e->violations !== []) {
            $body['violations'] = $e->violations;
        }

        return new JsonResponse($body, $e->httpStatus());
    }
}
