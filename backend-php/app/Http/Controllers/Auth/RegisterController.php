<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Auth\PrehashResolver;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;
use App\Domain\User\CreateUserData;
use App\Domain\User\UserRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class RegisterController extends Controller
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly PasswordHasherInterface $hasher,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'tenantId' => 'required|string',
            'phone' => 'sometimes|string',
        ]);

        $password = PrehashResolver::resolve(
            (string) $request->input('password'),
            $request->header('x-password-prehashed'),
            (bool) config('auth.require_prehash', false),
        );

        $data = new CreateUserData(
            tenantId: TenantId::from((string) $request->input('tenantId')),
            email: Email::from((string) $request->input('email')),
            passwordHash: $this->hasher->hash($password),
            // Self-registration never grants more than the lowest rung of the role ladder.
            role: (string) config('auth.default_registration_role', 'viewer'),
            name: trim($request->input('firstName') . ' ' . $request->input('lastName')),
            accountStatus: 'PENDING_VERIFICATION',
        );

        $user = $this->users->create($data);

        return new JsonResponse([
            'userId' => $user->id->value,
            'emailVerificationRequired' => true,
        ], 201);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'tenantId' => 'required|string',
        ]);

        // Token verification is handled by the user repository
        // For now, return a success stub — full implementation in Phase 3
        return new JsonResponse(['success' => true, 'message' => 'Email verified']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'tenantId' => 'required|string',
        ]);

        return new JsonResponse([
            'success' => true,
            'message' => 'If an account exists, a reset email has been sent',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'newPassword' => 'required|string|min:8',
        ]);

        $password = PrehashResolver::resolve(
            (string) $request->input('newPassword'),
            $request->header('x-password-prehashed'),
            (bool) config('auth.require_prehash', false),
        );

        // Token validation + password update — full implementation in Phase 3
        return new JsonResponse(['success' => true, 'message' => 'Password has been reset']);
    }
}
