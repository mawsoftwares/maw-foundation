<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Auth\TokenBlacklistInterface;
use App\Domain\Auth\TokenServiceInterface;
use App\Domain\Shared\Exceptions\UnauthorizedException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class JwtAuthenticate
{
    public function __construct(
        private readonly TokenServiceInterface $tokenService,
        private readonly TokenBlacklistInterface $blacklist,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');
        if (! str_starts_with($header, 'Bearer ')) {
            throw new UnauthorizedException('UNAUTHORIZED', 'Missing or invalid Authorization header');
        }

        $token = substr($header, 7);
        $claims = $this->tokenService->verify($token);

        if (isset($claims['jti']) && $this->blacklist->isBlacklisted((string) $claims['jti'])) {
            throw new UnauthorizedException('TOKEN_REVOKED', 'Token has been revoked');
        }

        $request->merge([
            'auth_user_id' => $claims['userId'] ?? null,
            'auth_tenant_id' => $claims['tenantId'] ?? null,
            'auth_role' => $claims['role'] ?? null,
            'auth_claims' => $claims,
        ]);

        return $next($request);
    }
}
