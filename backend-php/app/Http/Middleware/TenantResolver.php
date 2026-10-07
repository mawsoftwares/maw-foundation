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

        // `SET` cannot take bind parameters, so use set_config(). Session-scoped (not LOCAL): outside a transaction a
        // LOCAL setting would vanish immediately, and the connection lives only for this request, so it cannot leak.
        DB::select("SELECT set_config('app.tenant_id', ?, false)", [$tenantId]);

        return $next($request);
    }
}
