<?php

declare(strict_types=1);

namespace App\Access\Http\Middleware;

use App\Access\AccessRepository;
use App\Access\Actor;
use App\Domain\Shared\Exceptions\UnauthorizedException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Runs after `JwtAuthenticate`. Tenant and user come only from the verified token; the caller's ROLE is read
 * fresh from the database so a demoted or deleted user loses hierarchy standing immediately.
 */
final class AccessContext
{
    public function __construct(private readonly AccessRepository $repo) {}

    public function handle(Request $request, Closure $next): Response
    {
        $claims = $request->input('auth_claims');
        $tenantId = is_array($claims) ? ($claims['tenantId'] ?? null) : null;
        $userId = is_array($claims) ? ($claims['userId'] ?? null) : null;
        if (! is_string($tenantId) || $tenantId === '' || ! is_string($userId) || $userId === '') {
            throw new UnauthorizedException('TENANT_REQUIRED', 'Tenant and user context is required');
        }

        $role = $this->repo->userRole($tenantId, $userId);
        if ($role === null) {
            throw new UnauthorizedException('UNAUTHORIZED', 'Unknown user');
        }
        $request->attributes->set('access.actor', new Actor($userId, $tenantId, $role));

        return $next($request);
    }
}
