<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\ValueObjects\Email;
use App\Domain\User\CreateUserData;
use App\Domain\User\UserRepositoryInterface;
use App\Domain\Auth\PasswordHasherInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

final class UserController extends Controller
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly PasswordHasherInterface $hasher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $page = max(1, (int) $request->query('page', '1'));
        $limit = min(100, max(1, (int) $request->query('limit', '20')));

        $filters = array_filter([
            'role' => $request->query('role'),
            'status' => $request->query('status'),
            'search' => $request->query('search'),
        ]);

        $result = $this->users->list($tenantId, $page, $limit, $filters);

        return new JsonResponse([
            'success' => true,
            'data' => array_map(fn ($u) => $u->toResponse(), $result['items']),
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $result['total'],
                'totalPages' => (int) ceil($result['total'] / $limit),
            ],
        ]);
    }

    public function show(Request $request, string $userId): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $user = $this->users->findById($tenantId, $userId);

        if (! $user) {
            throw new NotFoundException('User not found');
        }

        return new JsonResponse([
            'success' => true,
            'data' => $user->toResponse(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
            'firstName' => 'required|string',
            'lastName' => 'required|string',
            'role' => 'required|string',
            'phone' => 'sometimes|string',
        ]);

        $tenantId = (string) $request->input('tenant_id');

        $data = new CreateUserData(
            email: Email::from((string) $request->input('email')),
            passwordHash: $this->hasher->hash((string) $request->input('password')),
            firstName: (string) $request->input('firstName'),
            lastName: (string) $request->input('lastName'),
            role: (string) $request->input('role'),
            phone: $request->input('phone') ? (string) $request->input('phone') : null,
        );

        $user = $this->users->create($tenantId, $data);

        return new JsonResponse([
            'success' => true,
            'data' => $user->toResponse(),
        ], 201);
    }

    public function update(Request $request, string $userId): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');

        $fields = array_filter([
            'first_name' => $request->input('firstName'),
            'last_name' => $request->input('lastName'),
            'phone' => $request->input('phone'),
            'role' => $request->input('role'),
        ], fn ($v) => $v !== null);

        $user = $this->users->update($tenantId, $userId, $fields);

        return new JsonResponse([
            'success' => true,
            'data' => $user->toResponse(),
        ]);
    }

    public function destroy(Request $request, string $userId): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $deleted = $this->users->delete($tenantId, $userId);

        if (! $deleted) {
            throw new NotFoundException('User not found');
        }

        return new JsonResponse(['success' => true], 200);
    }

    public function activate(Request $request, string $userId): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $user = $this->users->update($tenantId, $userId, ['account_status' => 'active']);

        return new JsonResponse([
            'success' => true,
            'data' => $user->toResponse(),
        ]);
    }

    public function deactivate(Request $request, string $userId): JsonResponse
    {
        $tenantId = (string) $request->input('tenant_id');
        $user = $this->users->update($tenantId, $userId, ['account_status' => 'suspended']);

        return new JsonResponse([
            'success' => true,
            'data' => $user->toResponse(),
        ]);
    }
}
