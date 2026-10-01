<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Domain\Shared\Exceptions\UnauthorizedException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

final class TenantResolver
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenantId = $request->input('auth_tenant_id')
            ?? $request->header('x-tenant-id');

        if (! $tenantId || ! is_string($tenantId)) {
            throw new UnauthorizedException('TENANT_REQUIRED', 'Tenant context is required');
        }

        $request->merge(['tenant_id' => $tenantId]);

        DB::statement("SET LOCAL app.tenant_id = ?", [$tenantId]);

        return $next($request);
    }
}
