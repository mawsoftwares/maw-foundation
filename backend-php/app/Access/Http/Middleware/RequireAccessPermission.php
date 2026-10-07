<?php

declare(strict_types=1);

namespace App\Access\Http\Middleware;

use App\Access\AccessRepository;
use App\Access\Actor;
use App\Domain\Shared\Exceptions\ForbiddenException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Data-driven permission gate (`Read_Users`, `Manage_Rbac`, ...). Accepts the legacy `Read|Users` spelling too. */
final class RequireAccessPermission
{
    public function __construct(private readonly AccessRepository $repo) {}

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $actor = $request->attributes->get('access.actor');
        if (! $actor instanceof Actor) {
            throw new ForbiddenException('Missing tenant or user context');
        }
        if (! $this->repo->userHasPermission($actor->tenantId, $actor->userId, $permission)) {
            throw new ForbiddenException("Missing required permission: {$permission}");
        }

        return $next($request);
    }
}
