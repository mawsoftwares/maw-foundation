<?php

declare(strict_types=1);

namespace App\Access\Http\Controllers;

use App\Access\Actor;
use App\Domain\Shared\Exceptions\ValidationException;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;

/**
 * Application-wide theme — PHP twin of apps/sample-server/src/theme-routes.ts, over the same `tenant_theme` table.
 * Everyone signed in reads it; only `Manage_Theme` changes it. The client sends the canonical design.md it already
 * normalised, so unlike Node this only sanity-checks that the text carries at least one color.
 */
final class ThemeController extends Controller
{
    private const MAX_BYTES = 64 * 1024;

    public function show(Request $request): JsonResponse
    {
        $row = DB::selectOne('SELECT design_md, updated_by, updated_at FROM tenant_theme WHERE tenant_id = ?', [$this->actor($request)->tenantId]);

        return new JsonResponse(['data' => $row === null ? null : $this->toDto($row)]);
    }

    /**
     * PUBLIC (no token): the login page should already look like the app. Returns only the design.md — never who
     * changed it or when — and the same `null` for a tenant with no theme and one that does not exist, so it cannot
     * be used to probe for tenants.
     */
    public function publicShow(Request $request): JsonResponse
    {
        $requested = $request->query('tenantId', config('auth.default_tenant_id'));
        $tenantId = is_string($requested) && preg_match('/^[A-Za-z0-9._-]{1,128}$/', $requested) === 1 ? $requested : null;
        $row = $tenantId === null ? null : DB::selectOne('SELECT design_md FROM tenant_theme WHERE tenant_id = ?', [$tenantId]);

        return (new JsonResponse(['data' => $row === null ? null : ['designMd' => (string) $row->design_md]]))
            ->header('Cache-Control', 'public, max-age=30');
    }

    public function update(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $designMd = $request->json('designMd');

        if (! is_string($designMd) || trim($designMd) === '') {
            throw new ValidationException('designMd (string) is required.');
        }
        if (strlen($designMd) > self::MAX_BYTES) {
            throw new ValidationException('design.md is too large.');
        }
        // Don't let a bad paste replace the whole app's look: it must contain at least one color value.
        if (preg_match('/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/', $designMd) !== 1) {
            throw new ValidationException('No theme colors could be read from that design.md.');
        }

        $row = DB::selectOne(
            'INSERT INTO tenant_theme (tenant_id, design_md, updated_by, updated_at) VALUES (?, ?, ?, NOW())
             ON CONFLICT (tenant_id) DO UPDATE SET design_md = EXCLUDED.design_md, updated_by = EXCLUDED.updated_by, updated_at = NOW()
             RETURNING design_md, updated_by, updated_at',
            [$actor->tenantId, $designMd, $actor->userId],
        );

        return new JsonResponse(['data' => $row === null ? null : $this->toDto($row)]);
    }

    public function destroy(Request $request): JsonResponse
    {
        DB::delete('DELETE FROM tenant_theme WHERE tenant_id = ?', [$this->actor($request)->tenantId]);

        return new JsonResponse(['data' => null]);
    }

    private function actor(Request $request): Actor
    {
        $actor = $request->attributes->get('access.actor');
        assert($actor instanceof Actor);

        return $actor;
    }

    /**
     * @return array{designMd: string, updatedBy: ?string, updatedAt: string}
     */
    private function toDto(object $row): array
    {
        return [
            'designMd' => (string) $row->design_md,
            'updatedBy' => $row->updated_by !== null ? (string) $row->updated_by : null,
            'updatedAt' => CarbonImmutable::parse((string) $row->updated_at)->utc()->format('Y-m-d\TH:i:s.v\Z'),
        ];
    }
}
