<?php

declare(strict_types=1);

namespace App\Access\Http\Controllers;

use App\Access\AccessPolicy;
use App\Access\AccessRepository;
use App\Access\Actor;
use App\Access\RoleHierarchy;
use App\Domain\Shared\Exceptions\ConflictException;
use App\Domain\Shared\Exceptions\NotFoundException;
use App\Domain\Shared\Exceptions\ValidationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;

/**
 * Role management with the strict role ladder: callers only see / edit roles strictly below their own,
 * can only create or move roles to a level strictly below their own, and can only grant permissions they hold.
 */
final class RoleController extends Controller
{
    public function __construct(
        private readonly AccessRepository $repo,
        private readonly AccessPolicy $policy,
    ) {}

    /** GET /v1/roles — active roles the caller may assign (pickers / filters). */
    public function assignable(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $codes = $this->policy->assignableRoleCodes($actor);
        $roles = array_values(array_filter($this->repo->roles(), static fn (array $r): bool => in_array($r['code'], $codes, true)));

        return new JsonResponse(['data' => array_map(
            static fn (array $r): array => ['id' => $r['id'], 'code' => $r['code'], 'name' => $r['name']],
            $roles,
        )]);
    }

    public function index(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $roles = RoleHierarchy::visibleRoles($this->repo->roles(), $actor->role);

        return new JsonResponse(['data' => array_map($this->toDto(...), $roles)]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        return new JsonResponse(['data' => $this->toDto($this->reachable($request, $id))]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->actor($request);
        $input = $this->validated($request, [
            'code' => 'required|string',
            'name' => 'required|string',
            'description' => 'sometimes|nullable|string',
            'sortOrder' => 'sometimes|integer',
            'level' => 'sometimes|integer',
        ]);

        $this->policy->assertCanSetRoleLevel($actor, (int) ($input['level'] ?? 0));
        if ($this->repo->roleCodeExists((string) $input['code'])) {
            throw new ConflictException('A role with this code already exists.');
        }

        $id = $this->repo->createRole(
            (string) $input['code'],
            (string) $input['name'],
            isset($input['description']) ? (string) $input['description'] : null,
            (int) ($input['sortOrder'] ?? 0),
            (int) ($input['level'] ?? 0),
        );

        return new JsonResponse(['data' => $this->toDto($this->repo->roleById($id) ?? throw new NotFoundException('Role', (string) $id))], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $actor = $this->actor($request);
        $role = $this->reachable($request, $id);
        $input = $this->validated($request, [
            'name' => 'sometimes|string',
            'description' => 'sometimes|nullable|string',
            'sortOrder' => 'sometimes|integer',
            'isActive' => 'sometimes|boolean',
            'level' => 'sometimes|integer',
        ]);

        $fields = [];
        foreach (['name' => 'name', 'description' => 'description', 'sortOrder' => 'sort_order', 'isActive' => 'is_active', 'level' => 'level'] as $in => $col) {
            if (array_key_exists($in, $input)) {
                $fields[$col] = $input[$in];
            }
        }
        if (isset($fields['level'])) {
            $this->policy->assertCanSetRoleLevel($actor, (int) $fields['level']);
        }
        if (isset($fields['is_active'])) {
            $fields['is_active'] = $fields['is_active'] ? 'true' : 'false';
        }
        $this->repo->updateRole($role['id'], $fields);

        return new JsonResponse(['data' => $this->toDto($this->repo->roleById($role['id']) ?? $role)]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $role = $this->reachable($request, $id);
        $this->repo->deleteRole($role['id']);

        return new JsonResponse(['success' => true]);
    }

    public function permissions(Request $request, string $id): JsonResponse
    {
        $role = $this->reachable($request, $id);

        return new JsonResponse(['data' => $this->repo->roleAssignments($role['id'])]);
    }

    public function setPermissions(Request $request, string $id): JsonResponse
    {
        $actor = $this->actor($request);
        $role = $this->reachable($request, $id);
        $input = $this->validated($request, [
            'assignments' => 'present|array',
            'assignments.*.permissionId' => 'required|integer',
            'assignments.*.moduleId' => 'sometimes|nullable|integer',
        ]);

        /** @var list<array{permissionId: int, moduleId?: int|null}> $raw */
        $raw = $input['assignments'];
        $assignments = array_map(static fn (array $a): array => [
            'permissionId' => (int) $a['permissionId'],
            'moduleId' => isset($a['moduleId']) ? (int) $a['moduleId'] : null,
        ], $raw);

        $this->policy->assertGrantCeiling($actor, $role['id'], array_values(array_unique(array_column($assignments, 'permissionId'))));
        $this->repo->replaceRolePermissions($role['id'], $assignments);

        return new JsonResponse(['success' => true]);
    }

    private function actor(Request $request): Actor
    {
        $actor = $request->attributes->get('access.actor');
        assert($actor instanceof Actor);

        return $actor;
    }

    /**
     * @return array{id: int, code: string, name: string, description: ?string, is_active: bool, sort_order: int, level: int}
     */
    private function reachable(Request $request, string $id): array
    {
        $role = $this->repo->roleById((int) $id) ?? throw new NotFoundException('Role', $id);
        $this->policy->assertCanReachRole($this->actor($request), $role);

        return $role;
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
     * @param array{id: int, code: string, name: string, description: ?string, is_active: bool, sort_order: int, level: int} $r
     * @return array<string, mixed>
     */
    private function toDto(array $r): array
    {
        return [
            'id' => $r['id'],
            'code' => $r['code'],
            'name' => $r['name'],
            'description' => $r['description'],
            'isActive' => $r['is_active'],
            'sortOrder' => $r['sort_order'],
            'level' => $r['level'],
        ];
    }
}
