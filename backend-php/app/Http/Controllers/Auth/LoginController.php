<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Access\AccessRepository;
use App\Domain\Auth\AuthClaims;
use App\Domain\Auth\AuthTokens;
use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Auth\PrehashResolver;
use App\Domain\Auth\SessionRepositoryInterface;
use App\Domain\Auth\TokenBlacklistInterface;
use App\Domain\Auth\TokenServiceInterface;
use App\Domain\Shared\Contracts\AccountStatus;
use App\Domain\Shared\Exceptions\UnauthorizedException;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\Shared\ValueObjects\TenantId;
use App\Domain\Shared\ValueObjects\UserId;
use App\Domain\User\UserEntity;
use App\Domain\User\UserRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

final class LoginController extends Controller
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly PasswordHasherInterface $hasher,
        private readonly TokenServiceInterface $tokenService,
        private readonly SessionRepositoryInterface $sessions,
        private readonly TokenBlacklistInterface $blacklist,
        private readonly AccessRepository $access,
    ) {}

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'tenantId' => 'sometimes|nullable|string',
        ]);

        // Single-tenant clients (sample-web's LoginForm) send no tenantId; fall back to the configured default,
        // exactly like the Node backend does with DEMO_TENANT.
        $tenantId = (string) ($request->input('tenantId') ?: config('auth.default_tenant_id'));
        $email = (string) $request->input('email');
        $rawPassword = (string) $request->input('password');

        $password = PrehashResolver::resolve(
            $rawPassword,
            $request->header('x-password-prehashed'),
            (bool) config('auth.require_prehash', false),
        );

        $user = $this->users->findByEmail(TenantId::from($tenantId), Email::from($email));

        if (! $user || ! $this->hasher->verify($password, $user->passwordHash)) {
            throw new UnauthorizedException('INVALID_CREDENTIALS', 'Invalid email or password');
        }

        // Hashes written with a 16-byte salt (older Node) verify slowly; upgrade them once, now that we have the plaintext.
        if ($this->hasher->needsRehash($user->passwordHash)) {
            $this->users->updatePassword($user->id, $this->hasher->hash($password));
        }

        if ($user->accountStatus !== AccountStatus::ACTIVE) {
            throw new UnauthorizedException('ACCOUNT_INACTIVE', 'Account is not active');
        }

        if ($user->mfaEnabled) {
            $challengeToken = Str::uuid()->toString();

            return new JsonResponse([
                'requiresMfa' => true,
                'challengeToken' => $challengeToken,
                'userId' => $user->id->value,
            ]);
        }

        $tokens = $this->issueTokens($user->id->value, $tenantId, $user->role, $user->audience);

        $this->sessions->create($tenantId, $user->id->value, hash('sha256', $tokens->refreshToken), [
            'ipAddress' => $request->ip(),
            'userAgent' => $request->userAgent() ?? 'unknown',
        ]);
        $this->users->updateLastLogin($user->id, now()->toIso8601String());

        return new JsonResponse($this->authResult($tokens, $user));
    }

    public function refresh(Request $request): JsonResponse
    {
        $request->validate(['refreshToken' => 'required|string']);

        $refreshToken = (string) $request->input('refreshToken');
        $hash = hash('sha256', $refreshToken);

        $session = $this->sessions->findByRefreshTokenHash($hash);
        if (! $session) {
            throw new UnauthorizedException('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
        }

        // Role and audience come from the user's CURRENT record, never a hard-coded value, so a refresh cannot
        // outlive a demotion or a disabled account.
        $user = $this->users->findById(UserId::from((string) $session['userId']));
        if (! $user || $user->tenantId->value !== (string) $session['tenantId'] || $user->accountStatus !== AccountStatus::ACTIVE) {
            throw new UnauthorizedException('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
        }

        $tokens = $this->issueTokens($user->id->value, $user->tenantId->value, $user->role, $user->audience);

        $this->sessions->revoke((string) $session['id']);
        $this->sessions->create(
            (string) $session['tenantId'],
            (string) $session['userId'],
            hash('sha256', $tokens->refreshToken),
            [
                'ipAddress' => $request->ip(),
                'userAgent' => $request->userAgent() ?? 'unknown',
            ],
        );

        return new JsonResponse($this->authResult($tokens, $user));
    }

    public function logout(Request $request): JsonResponse
    {
        $claims = $request->input('auth_claims', []);
        if (is_array($claims) && isset($claims['jti'])) {
            $exp = (int) ($claims['exp'] ?? time() + 900);
            $this->blacklist->add((string) $claims['jti'], $exp);
        }

        return new JsonResponse(['success' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        $userId = (string) $request->input('auth_user_id');
        $tenantId = (string) $request->input('auth_tenant_id');

        $user = $this->users->findById(UserId::from($userId));
        if (! $user || $user->tenantId->value !== $tenantId) {
            throw new UnauthorizedException('USER_NOT_FOUND', 'Authenticated user not found');
        }

        return new JsonResponse($user->toResponse());
    }

    /**
     * Flat token fields stay for the PHP contract tests; `tokens` + `session` give web/RN clients (api-client's
     * AuthResult) the same shape the Node backend returns.
     *
     * @return array<string, mixed>
     */
    private function authResult(AuthTokens $tokens, UserEntity $user): array
    {
        $flat = $tokens->toResponse();

        return $flat + [
            'tokens' => [
                'accessToken' => $tokens->accessToken,
                'refreshToken' => $tokens->refreshToken,
            ],
            'session' => [
                'userId' => $user->id->value,
                'tenantId' => $user->tenantId->value,
                'role' => $user->role,
                'accountStatus' => $user->accountStatus->value,
                'audience' => $user->audience,
                'entitlements' => array_column($this->access->catalogModules(), 'key'),
                'capabilities' => [],
                'scopeId' => $user->scopeId,
            ],
        ];
    }

    private function issueTokens(string $userId, string $tenantId, string $role, string $audience): AuthTokens
    {
        $jti = Str::uuid()->toString();
        $accessExpiresIn = (int) config('auth.access_token_ttl', 900);
        $refreshExpiresIn = (int) config('auth.refresh_token_ttl', 604800);

        $accessToken = $this->tokenService->sign([
            'userId' => $userId,
            'tenantId' => $tenantId,
            'role' => $role,
            'audience' => $audience,
            'jti' => $jti,
            'expiresIn' => $accessExpiresIn,
        ]);

        $refreshToken = Str::random(64);

        return new AuthTokens($accessToken, $refreshToken, $accessExpiresIn, $refreshExpiresIn);
    }
}
