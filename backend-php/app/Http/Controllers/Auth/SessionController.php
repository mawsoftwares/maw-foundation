<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Domain\Auth\SessionRepositoryInterface;
use App\Domain\Shared\Exceptions\NotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class SessionController extends Controller
{
    public function __construct(
        private readonly SessionRepositoryInterface $sessions,
    ) {}

    public function list(Request $request): JsonResponse
    {
        $tenantId = (string) $request->input('auth_tenant_id');
        $userId = (string) $request->input('auth_user_id');

        $sessions = $this->sessions->listForUser($tenantId, $userId);

        return new JsonResponse(['sessions' => $sessions]);
    }

    public function revoke(Request $request, string $sessionId): JsonResponse
    {
        $tenantId = (string) $request->input('auth_tenant_id');
        $userId = (string) $request->input('auth_user_id');

        $revoked = $this->sessions->revokeOwned($sessionId, $tenantId, $userId);

        if (! $revoked) {
            throw new NotFoundException('Session', $sessionId);
        }

        return new JsonResponse(['success' => true]);
    }

    public function revokeAll(Request $request): JsonResponse
    {
        $tenantId = (string) $request->input('auth_tenant_id');
        $userId = (string) $request->input('auth_user_id');

        $count = $this->sessions->revokeAllForUser($tenantId, $userId);

        return new JsonResponse(['success' => true, 'revokedCount' => $count]);
    }
}
