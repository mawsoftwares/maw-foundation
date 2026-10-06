<?php

declare(strict_types=1);

namespace App\Storage\Http\Middleware;

use App\Domain\Shared\Exceptions\ForbiddenException;
use App\Storage\Core\Actor;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Data-driven RBAC check against the SAME tables the Node backend uses (`master_roles`, `master_permissions`,
 * `role_permissions`), so both backends grant exactly the same access. Accepts `Read_Storage` and the legacy
 * `Read|Storage` spelling, like Node's `matchesPermission`.
 */
final class RequireStoragePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $actor = $request->attributes->get('storage.actor');
        if (! $actor instanceof Actor || $actor->userId === null) {
            throw new ForbiddenException('Missing tenant or user context');
        }
        if (! $this->userHas($actor, $permission)) {
            throw new ForbiddenException("Missing required permission: {$permission}");
        }

        return $next($request);
    }

    private function userHas(Actor $actor, string $permission): bool
    {
        $legacy = preg_replace('/_/', '|', $permission, 1) ?? $permission;

        return DB::selectOne(
            'SELECT 1 AS ok FROM users u
               JOIN master_roles r ON r.code = u.role AND r.is_active
               JOIN role_permissions rp ON rp.role_id = r.id
               JOIN master_permissions p ON p.id = rp.permission_id AND p.is_active
              WHERE u.id = ? AND u.tenant_id = ? AND p.code IN (?, ?) LIMIT 1',
            [$actor->userId, $actor->tenantId, $permission, $legacy],
        ) !== null;
    }
}
