<?php

declare(strict_types=1);

namespace App\Access\Http\Controllers;

use App\Access\AccessPolicy;
use App\Access\AccessRepository;
use App\Access\Actor;
use App\Domain\Auth\PasswordHasherInterface;
use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\Exceptions\ValidationException;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * User management with the strict role ladder: callers only list / read / change users whose role is strictly
 * below their own (plus themselves), and may only assign roles strictly below their own.
 */
final class UserController extends Controller
{
    public function __construct(
        private readonly AccessRepository $repo,
        private readonly AccessPolicy $policy,
        private readonly PasswordHasherInterface $hasher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $page = max(1, (int) $request->query('page', '1'));
        $limit = min(100, max(1, (int) ($request->query('pageSize') ?? $request->query('limit', '20'))));

        $result = $this->repo->listUsers(
            $actor->tenantId,
            $this->policy->assignableRoleCodes($actor),
            $actor->userId,
            [
                'search' => $this->str($request->query('search')),
                'status' => $this->str($request->query('status')),
                'role' => $this->str($request->query('role')),
            ],
            $page,
            $limit,
        );

        return new JsonResponse([
            'success' => true,
            'data' => array_map(fn (object $u): array => $this->toResponse($u), $result['items']),
            'meta' => ['pagination' => [
                'page' => $page,
                'pageSize' => $limit,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $limit),
            ]],
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return new JsonResponse(['success' => true, 'data' => $this->toResponse($this->reachable($request, $id))]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $input = $this->validated($request, [
            'email' => 'required|email',
            'firstName' => 'required|string',
            'lastName' => 'sometimes|nullable|string',
            'password' => 'sometimes|nullable|string|min:8',
            'phone' => 'sometimes|nullable|string',
            'role' => 'sometimes|nullable|string',
        ]);

        $role = trim((string) ($input['role'] ?? '')) ?: 'viewer';
        $this->policy->assertCanAssignRole($actor, $role);

        $email = strtolower(trim((string) $input['email']));
        if ($this->repo->emailTaken($actor->tenantId, $email)) {
            throw new ConflictException('A user with this email already exists');
        }

        $id = Str::uuid()->toString();
        $this->repo->createUser(
            $id,
            $actor->tenantId,
            $email,
            $role,
            trim($input['firstName'] . ' ' . ($input['lastName'] ?? '')),
            isset($input['phone']) ? (string) $input['phone'] : null,
            isset($input['password']) ? $this->hashPassword((string) $input['password']) : '',
        );

        return new JsonResponse(['success' => true, 'data' => $this->toResponse($this->repo->findUser($actor->tenantId, $id) ?? throw new NotFoundException('User', $id))], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $actor = $this->actor($request);
        $target = $this->reachable($request, $id);
        $input = $this->validated($request, [
            'firstName' => 'sometimes|string',
            'lastName' => 'sometimes|nullable|string',
            'phone' => 'sometimes|nullable|string',
            'role' => 'sometimes|string',
        ]);

        $fields = [];
        if (array_key_exists('firstName', $input) || array_key_exists('lastName', $input)) {
            [$first, $last] = array_pad(preg_split('/\s+/', trim((string) $target->name), 2) ?: [], 2, '');
            $fields['name'] = trim(((string) ($input['firstName'] ?? $first)) . ' ' . ((string) ($input['lastName'] ?? $last)));
        }
        if (array_key_exists('phone', $input)) {
            $fields['phone'] = $input['phone'];
        }
        // Re-sending the user's current role is not an assignment; changing it is, and is bounded by the ladder.
        if (isset($input['role']) && $input['role'] !== (string) $target->role) {
            $this->policy->assertCanAssignRole($actor, (string) $input['role']);
            $fields['role'] = $input['role'];
        }

        $this->repo->updateUser($actor->tenantId, $id, $fields);

        return new JsonResponse(['success' => true, 'data' => $this->toResponse($this->repo->findUser($actor->tenantId, $id) ?? $target)]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->reachable($request, $id);
        $this->repo->updateUser($this->actor($request)->tenantId, $id, ['account_status' => 'DISABLED']);

        return new JsonResponse(['success' => true, 'data' => ['deleted' => true]]);
    }

    public function activate(Request $request, string $id): JsonResponse
    {
        return $this->setStatus($request, $id, 'ACTIVE');
    }

    public function deactivate(Request $request, string $id): JsonResponse
    {
        return $this->setStatus($request, $id, 'SUSPENDED');
    }

    public function resetPassword(Request $request, string $id): JsonResponse
    {
        $this->reachable($request, $id);
        $input = $this->validated($request, ['newPassword' => 'required|string|min:8']);
        $this->repo->updateUser($this->actor($request)->tenantId, $id, ['password_hash' => $this->hashPassword((string) $input['newPassword'])]);

        return new JsonResponse(['success' => true, 'data' => ['success' => true]]);
    }

    private function setStatus(Request $request, string $id, string $status): JsonResponse
    {
        $this->reachable($request, $id);
        $this->repo->updateUser($this->actor($request)->tenantId, $id, ['account_status' => $status]);

        return new JsonResponse(['success' => true, 'data' => ['success' => true]]);
    }

    /** Admin-set passwords are stored as scrypt(sha256(plaintext)), the same way a prehashing client sends them. */
    private function hashPassword(string $plain): string
    {
        return $this->hasher->hash(hash('sha256', $plain));
    }

    private function actor(Request $request): Actor
    {
        $actor = $request->attributes->get('access.actor');
        assert($actor instanceof Actor);

        return $actor;
    }

    private function reachable(Request $request, string $id): object
    {
        $actor = $this->actor($request);
        $target = $this->repo->findUser($actor->tenantId, $id) ?? throw new NotFoundException('User', $id);
        $this->policy->assertCanReachUser($actor, $target);

        return $target;
    }

    private function str(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * @param array<string, string> $rules
     * @return array<string, mixed>
     */
    private function validated(Request $request, array $rules): array
    {
        $validator = Validator::make($request->json()->all() ?: $request->all(), $rules);
        if ($validator->fails()) {
            /** @var array<string, string[]> $errors */
            $errors = $validator->errors()->toArray();
            throw new ValidationException('Validation failed', $errors);
        }

        return $validator->validated();
    }

    /**
     * @return array<string, mixed>
     */
    private function toResponse(object $u): array
    {
        $iso = static fn (mixed $v): ?string => $v !== null ? CarbonImmutable::parse((string) $v)->utc()->format('Y-m-d\TH:i:s.v\Z') : null;

        return [
            'id' => (string) $u->id,
            'tenantId' => (string) $u->tenant_id,
            'email' => (string) $u->email,
            'name' => $u->name !== null ? (string) $u->name : null,
            'role' => (string) $u->role,
            'audience' => (string) $u->audience,
            'scopeId' => $u->scope_id !== null ? (string) $u->scope_id : null,
            'accountStatus' => (string) $u->account_status,
            'emailVerified' => (bool) $u->email_verified,
            'mfaEnabled' => (bool) $u->mfa_enabled,
            'lastLoginAt' => $iso($u->last_login_at),
            'createdAt' => $iso($u->created_at),
            'updatedAt' => $iso($u->updated_at),
        ];
    }
}
