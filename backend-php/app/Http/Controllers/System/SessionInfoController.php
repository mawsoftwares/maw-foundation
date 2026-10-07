<?php

declare(strict_types=1);

namespace App\Http\Controllers\System;

use App\Access\AccessRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * Root aliases matching the Node sample-server surface used by sample-web
 * (`GET /me`, `GET /modules`). Kept separate from `LoginController::me` (OpenAPI profile).
 */
final class SessionInfoController extends Controller
{
    public function __construct(
        private readonly AccessRepository $access,
    ) {}

    public function me(Request $request): JsonResponse
    {
        /** @var array<string, mixed> $claims */
        $claims = $request->input('auth_claims', []);
        $userId = (string) ($claims['userId'] ?? $request->input('auth_user_id', ''));
        $tenantId = (string) ($claims['tenantId'] ?? $request->input('auth_tenant_id', ''));
        $role = (string) ($claims['role'] ?? $request->input('auth_role', ''));
        $audience = isset($claims['audience']) ? (string) $claims['audience'] : null;

        return new JsonResponse([
            'userId' => $userId,
            'tenantId' => $tenantId,
            'role' => $role,
            'audience' => $audience,
            'permissions' => $this->access->permissionCodesForUser($tenantId, $userId),
        ]);
    }

    public function modules(): JsonResponse
    {
        return new JsonResponse([
            'modules' => $this->access->catalogModules(),
        ]);
    }
}
