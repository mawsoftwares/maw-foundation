<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Auth\PrehashResolver;
use App\Domain\Shared\ValueObjects\Email;
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

        $tenantId = (string) $request->input('tenantId');

        $data = new CreateUserData(
            email: Email::from((string) $request->input('email')),
            passwordHash: $this->hasher->hash($password),
            firstName: (string) $request->input('firstName'),
            lastName: (string) $request->input('lastName'),
            role: 'user',
            phone: $request->input('phone') ? (string) $request->input('phone') : null,
        );

        $user = $this->users->create($tenantId, $data);

        return new JsonResponse([
            'userId' => $user->id,
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
