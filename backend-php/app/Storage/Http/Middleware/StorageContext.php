<?php

declare(strict_types=1);

namespace App\Storage\Http\Middleware;

use App\Domain\Shared\Exceptions\UnauthorizedException;
use App\Storage\Core\Actor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Runs after `JwtAuthenticate`. Takes tenant and user STRICTLY from the verified token claims — never from the
 * `x-tenant-id` header or the request body — and stores them as a request attribute for the controllers.
 */
final class StorageContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $claims = $request->input('auth_claims');
        $tenantId = is_array($claims) ? ($claims['tenantId'] ?? null) : null;
        $userId = is_array($claims) ? ($claims['userId'] ?? null) : null;

        if (! is_string($tenantId) || $tenantId === '') {
            throw new UnauthorizedException('TENANT_REQUIRED', 'Tenant context is required');
        }
        $request->attributes->set('storage.actor', new Actor($tenantId, is_string($userId) && $userId !== '' ? $userId : null));

        return $next($request);
    }
}
