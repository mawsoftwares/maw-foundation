<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Rbac\RbacRepositoryInterface;
use App\Domain\Shared\Exceptions\ForbiddenException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class RequirePermission
{
    public function __construct(
        private readonly RbacRepositoryInterface $rbac,
    ) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $tenantId = $request->input('tenant_id');
        $userId = $request->input('auth_user_id');

        if (! $tenantId || ! $userId) {
            throw new ForbiddenException('Missing tenant or user context');
        }

        if (! $this->rbac->userHasPermission((string) $tenantId, (string) $userId, $permission)) {
            throw new ForbiddenException("Missing required permission: {$permission}");
        }

        return $next($request);
    }
}
